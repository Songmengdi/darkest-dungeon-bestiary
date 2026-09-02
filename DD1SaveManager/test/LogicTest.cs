using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace DD1SaveManager
{
    // SaveService 核心逻辑的往返测试（备份→改动→恢复→比对；克隆；清理）。
    internal static class LogicTest
    {
        private static int _passed;

        private static void Check(bool cond, string name)
        {
            if (!cond) throw new ApplicationException("测试失败: " + name);
            _passed++;
            Console.WriteLine("[PASS] " + name);
        }

        private static string TempDir(string tag)
        {
            string d = Path.Combine(Path.GetTempPath(), "dd1sm_test_" + tag + "_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(d);
            return d;
        }

        private static void WriteFile(string path, string content)
        {
            string dir = Path.GetDirectoryName(path);
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            File.WriteAllText(path, content, new UTF8Encoding(false));
        }

        private static List<string> RelFiles(string root)
        {
            var list = new List<string>();
            if (!Directory.Exists(root)) return list;
            foreach (string f in Directory.GetFiles(root, "*", SearchOption.AllDirectories))
                list.Add(f.Substring(root.Length).TrimStart('\\', '/').ToLowerInvariant());
            return list;
        }

        private static bool DirsEqual(string a, string b, string excludeFile)
        {
            string ex = excludeFile == null ? null : excludeFile.ToLowerInvariant();
            List<string> fa = RelFiles(a).FindAll(delegate(string x) { return ex == null || Path.GetFileName(x) != ex; });
            List<string> fb = RelFiles(b).FindAll(delegate(string x) { return ex == null || Path.GetFileName(x) != ex; });
            if (fa.Count != fb.Count) return false;
            foreach (string rel in fa)
            {
                string pa = Path.Combine(a, rel);
                string pb = Path.Combine(b, rel);
                if (!File.Exists(pb)) return false;
                byte[] ba = File.ReadAllBytes(pa);
                byte[] bb = File.ReadAllBytes(pb);
                if (ba.Length != bb.Length) return false;
                for (int i = 0; i < ba.Length; i++) if (ba[i] != bb[i]) return false;
            }
            return true;
        }

        private static int Run()
        {
            Console.WriteLine("== DD1SaveManager Logic Test ==");
            Console.WriteLine("Game running: " + SaveService.IsGameRunning());

            string saveRoot = TempDir("save");
            string backupRoot = TempDir("bak");

            // 伪造两个插槽
            string p0 = Path.Combine(saveRoot, "profile_0");
            WriteFile(Path.Combine(p0, "persist.game.json"), "{\"slot\":0,\"hp\":100}");
            WriteFile(Path.Combine(p0, "persist.roster.json"), "{\"heroes\":7}");
            WriteFile(Path.Combine(p0, "nested", "deep", "sub.json"), "nested-content");
            WriteFile(Path.Combine(p0, "backup", "old.json"), "game-own-backup");
            WriteFile(Path.Combine(saveRoot, "profile_1", "persist.game.json"), "{\"slot\":1}");

            // 1. 插槽枚举
            List<string> slots = SaveService.FindSlots(saveRoot);
            Check(slots.Count == 2 && slots[0] == "profile_0" && slots[1] == "profile_1", "FindSlots 枚举并按序排列");

            // 2. 备份（含特殊字符备注）
            BackupInfo b1 = SaveService.Backup(saveRoot, backupRoot, "profile_0", "测试: 备注/?*", 0);
            Check(Directory.Exists(b1.DirPath), "备份目录已创建");
            Check(File.Exists(Path.Combine(b1.DirPath, SaveService.ManifestName)), "清单文件已写入");
            Check(DirsEqual(p0, b1.DirPath, SaveService.ManifestName), "备份内容与源一致");

            // 4 个数据文件 + 1 个清单 = 5
            List<BackupInfo> list = SaveService.ListBackups(backupRoot, "profile_0");
            Check(list.Count == 1 && list[0].FileCount == 5, "ListBackups 读取数量正确(5个文件)");
            Check(list[0].Label == "测试: 备注/?*", "列表显示清单中的原始备注");

            // 3. 改动源后恢复
            WriteFile(Path.Combine(p0, "persist.game.json"), "{\"slot\":0,\"hp\":1}");
            WriteFile(Path.Combine(p0, "extra.txt"), "should disappear");
            SaveService.Restore(b1.DirPath, p0);
            Check(DirsEqual(p0, b1.DirPath, SaveService.ManifestName), "恢复后内容与备份一致");
            Check(!File.Exists(Path.Combine(p0, "extra.txt")), "恢复清除了备份中不存在的新文件");
            Check(File.ReadAllText(Path.Combine(p0, "persist.game.json")).Contains("\"hp\":100"), "恢复还原了被改动的文件");

            // 4. 克隆到不存在的插槽
            SaveService.CloneBackupToSlot(b1.DirPath, saveRoot, "profile_2", backupRoot, 0);
            string p2 = Path.Combine(saveRoot, "profile_2");
            Check(Directory.Exists(p2) && DirsEqual(p2, b1.DirPath, SaveService.ManifestName), "克隆创建了新插槽 profile_2");

            // 5. 克隆覆盖已有插槽 → 自动备份
            int pre = SaveService.ListBackups(backupRoot, "profile_2").Count;
            SaveService.CloneBackupToSlot(b1.DirPath, saveRoot, "profile_2", backupRoot, 0);
            int post = SaveService.ListBackups(backupRoot, "profile_2").Count;
            Check(post == pre + 1, "克隆覆盖前自动备份了目标插槽");

            // 6. 保留数量清理 keep=3
            for (int i = 0; i < 5; i++)
            {
                WriteFile(Path.Combine(p0, "persist.game.json"), "{\"rev\":" + i + "}");
                SaveService.Backup(saveRoot, backupRoot, "profile_0", "prune" + i, 3);
            }
            List<BackupInfo> after = SaveService.ListBackups(backupRoot, "profile_0");
            Check(after.Count == 3, "保留数量清理后剩余3份(实际 " + after.Count + ")");
            bool keptNewest = after.Exists(delegate(BackupInfo x) { return x.Label == "prune4"; });
            Check(keptNewest, "清理后仍保留最新备份(prune4)");

            // 7. 备注清洗
            string clean = SaveService.SanitizeLabel("  a/b\\c:d?  ");
            Check(clean.IndexOfAny(Path.GetInvalidFileNameChars()) < 0, "备注中的非法字符已清洗");

            Console.WriteLine("== 全部通过: " + _passed + " 项 ==");
            return 0;
        }

        private static int Main()
        {
            try
            {
                return Run();
            }
            catch (Exception ex)
            {
                Console.WriteLine("[FAIL] " + ex.Message);
                Console.WriteLine(ex.StackTrace);
                return 1;
            }
        }
    }
}
