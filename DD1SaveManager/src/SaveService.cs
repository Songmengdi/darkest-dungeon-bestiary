using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

namespace DD1SaveManager
{
    public class BackupInfo
    {
        public string DirPath;
        public DateTime Created;
        public string Label;
        public long Bytes;
        public int FileCount;

        public string Name
        {
            get { return Path.GetFileName(DirPath); }
        }
    }

    /// <summary>
    /// 暗黑地牢1 存档备份/恢复核心逻辑（无 UI 依赖，可独立测试）。
    /// 一个"插槽"即存档根目录下的 profile_N 文件夹；
    /// 一个"备份"即 备份根目录\profile_N\时间戳_备注\ 的完整文件夹快照。
    /// </summary>
    public static class SaveService
    {
        public const string ManifestName = "dd1backup.json";
        public const string StampFormat = "yyyy-MM-dd_HHmmss";
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();
        private static readonly Regex SlotRegex = new Regex(@"^profile_\d+$", RegexOptions.Compiled);
        private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

        /// <summary>检测暗黑地牢(darkest.exe)是否正在运行。</summary>
        public static bool IsGameRunning()
        {
            Process[] ps = Process.GetProcesses();
            try
            {
                foreach (Process p in ps)
                {
                    try
                    {
                        string n = p.ProcessName;
                        if (!string.IsNullOrEmpty(n) &&
                            n.IndexOf("darkest", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            return true;
                        }
                    }
                    catch { }
                }
            }
            finally
            {
                foreach (Process p in ps) { try { p.Dispose(); } catch { } }
            }
            return false;
        }

        /// <summary>枚举存档根目录下所有 profile_N 插槽，按插槽号升序。</summary>
        public static List<string> FindSlots(string saveRoot)
        {
            var list = new List<string>();
            if (string.IsNullOrEmpty(saveRoot) || !Directory.Exists(saveRoot)) return list;
            foreach (string d in Directory.GetDirectories(saveRoot, "profile_*"))
            {
                string name = Path.GetFileName(d);
                if (SlotRegex.IsMatch(name)) list.Add(name);
            }
            list.Sort(delegate(string a, string b) { return SlotNumber(a).CompareTo(SlotNumber(b)); });
            return list;
        }

        public static int SlotNumber(string slot)
        {
            int v;
            int.TryParse(slot.Substring("profile_".Length), NumberStyles.Integer, Inv, out v);
            return v;
        }

        /// <summary>备份一个插槽。返回备份信息；失败抛异常。</summary>
        public static BackupInfo Backup(string saveRoot, string backupRoot, string slot, string label, int keepPerSlot)
        {
            if (string.IsNullOrEmpty(saveRoot) || !Directory.Exists(saveRoot))
                throw new ApplicationException("存档根目录不存在：" + saveRoot);
            if (string.IsNullOrEmpty(backupRoot))
                throw new ApplicationException("未设置备份目录");
            string src = Path.Combine(saveRoot, slot);
            if (!Directory.Exists(src))
                throw new ApplicationException("未找到插槽目录：" + src);

            string safeLabel = SanitizeLabel(label);
            string stamp = DateTime.Now.ToString(StampFormat, Inv);
            string name = stamp + (safeLabel.Length > 0 ? "_" + safeLabel : "");
            string destRoot = Path.Combine(backupRoot, slot);
            string dest = Path.Combine(destRoot, name);
            int dup = 1;
            while (Directory.Exists(dest))
            {
                dup++;
                dest = Path.Combine(destRoot, name + "_" + dup);
            }
            Directory.CreateDirectory(dest);

            CopyDir(src, dest, null);

            long bytes;
            int count;
            Measure(dest, out bytes, out count);

            var manifest = new Dictionary<string, object>();
            manifest["app"] = "DD1SaveManager";
            manifest["version"] = 1;
            manifest["slot"] = slot;
            manifest["created"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", Inv);
            manifest["label"] = label == null ? "" : label;
            manifest["source"] = src;
            manifest["files"] = count;
            manifest["bytes"] = bytes;
            File.WriteAllText(Path.Combine(dest, ManifestName), Json.Serialize(manifest));

            if (keepPerSlot > 0) Prune(backupRoot, slot, keepPerSlot);

            BackupInfo info = DescribeBackup(dest);
            info.Label = label == null ? "" : label;
            return info;
        }

        /// <summary>列出某插槽的全部备份，按时间从新到旧。</summary>
        public static List<BackupInfo> ListBackups(string backupRoot, string slot)
        {
            var result = new List<BackupInfo>();
            if (string.IsNullOrEmpty(backupRoot) || string.IsNullOrEmpty(slot)) return result;
            string root = Path.Combine(backupRoot, slot);
            if (!Directory.Exists(root)) return result;
            foreach (string d in Directory.GetDirectories(root))
            {
                try { result.Add(DescribeBackup(d)); } catch { }
            }
            result.Sort(delegate(BackupInfo a, BackupInfo b) { return b.Created.CompareTo(a.Created); });
            return result;
        }

        /// <summary>描述一个备份目录（读清单，读不到就从文件夹名推断）。</summary>
        public static BackupInfo DescribeBackup(string dir)
        {
            if (!Directory.Exists(dir)) throw new ApplicationException("备份目录不存在：" + dir);
            var info = new BackupInfo();
            info.DirPath = dir;
            info.Created = DateTime.MinValue;
            info.Label = "";
            DateTime parsed;
            string folder = Path.GetFileName(dir);
            if (folder != null && folder.Length >= 17 &&
                DateTime.TryParseExact(folder.Substring(0, 17), StampFormat, Inv,
                    DateTimeStyles.None, out parsed))
            {
                info.Created = parsed;
                info.Label = folder.Length > 18 ? folder.Substring(18) : "";
            }
            else
            {
                info.Created = Directory.GetCreationTime(dir);
            }
            try
            {
                string mf = Path.Combine(dir, ManifestName);
                if (File.Exists(mf))
                {
                    var m = Json.Deserialize<Dictionary<string, object>>(File.ReadAllText(mf));
                    if (m != null)
                    {
                        object v;
                        // 清单里的备注是用户输入的原文（文件夹名只能存清洗后的版本），优先采用
                        if (m.TryGetValue("label", out v) && v != null && v.ToString().Length > 0)
                            info.Label = v.ToString();
                        if (m.TryGetValue("created", out v) && v != null)
                        {
                            DateTime t;
                            if (DateTime.TryParse(v.ToString(), Inv, DateTimeStyles.None, out t))
                                info.Created = t;
                        }
                    }
                }
            }
            catch { }
            long bytes;
            int count;
            Measure(dir, out bytes, out count);
            info.Bytes = bytes;
            info.FileCount = count;
            return info;
        }

        /// <summary>用备份覆盖目标插槽目录（先清空再拷入，跳过清单文件）。</summary>
        public static void Restore(string backupDir, string targetDir)
        {
            if (string.IsNullOrEmpty(backupDir) || !Directory.Exists(backupDir))
                throw new ApplicationException("备份目录不存在：" + backupDir);
            if (string.IsNullOrEmpty(targetDir))
                throw new ApplicationException("恢复目标目录为空");
            string parent = Path.GetDirectoryName(targetDir);
            if (!string.IsNullOrEmpty(parent) && !Directory.Exists(parent))
                Directory.CreateDirectory(parent);
            ClearDir(targetDir);
            CopyDir(backupDir, targetDir, ManifestName);
        }

        /// <summary>把某个备份克隆到另一个插槽；若目标插槽已存在，先自动备份一份。</summary>
        public static void CloneBackupToSlot(string backupDir, string saveRoot, string targetSlot,
            string backupRoot, int keepPerSlot)
        {
            if (FindSlots(saveRoot).Contains(targetSlot) || Directory.Exists(Path.Combine(saveRoot, targetSlot)))
            {
                Backup(saveRoot, backupRoot, targetSlot, "克隆覆盖前自动备份", keepPerSlot);
            }
            Restore(backupDir, Path.Combine(saveRoot, targetSlot));
        }

        public static void DeleteBackup(string dir)
        {
            if (string.IsNullOrEmpty(dir) || !Directory.Exists(dir))
                throw new ApplicationException("备份目录不存在：" + dir);
            Directory.Delete(dir, true);
        }

        /// <summary>每个插槽只保留最新的 keepPerSlot 份备份，多余的从旧到新删除。</summary>
        public static int Prune(string backupRoot, string slot, int keepPerSlot)
        {
            if (keepPerSlot <= 0) return 0;
            List<BackupInfo> all = ListBackups(backupRoot, slot);
            int removed = 0;
            for (int i = keepPerSlot; i < all.Count; i++)
            {
                try { Directory.Delete(all[i].DirPath, true); removed++; } catch { }
            }
            return removed;
        }

        // ---------- 内部工具 ----------

        public static string SanitizeLabel(string label)
        {
            if (label == null) return "";
            string t = label.Trim();
            var sb = new System.Text.StringBuilder();
            foreach (char c in t)
            {
                if (Array.IndexOf(Path.GetInvalidFileNameChars(), c) >= 0) sb.Append('_');
                else sb.Append(c);
                if (sb.Length >= 40) break;
            }
            return sb.ToString().Trim();
        }

        private static void CopyDir(string src, string dst, string excludeFileName)
        {
            Directory.CreateDirectory(dst);
            foreach (string file in Directory.GetFiles(src, "*", SearchOption.AllDirectories))
            {
                if (excludeFileName != null &&
                    string.Equals(Path.GetFileName(file), excludeFileName, StringComparison.OrdinalIgnoreCase))
                    continue;
                string rel = file.Substring(src.Length).TrimStart('\\', '/');
                string target = Path.Combine(dst, rel);
                string tdir = Path.GetDirectoryName(target);
                if (!string.IsNullOrEmpty(tdir) && !Directory.Exists(tdir)) Directory.CreateDirectory(tdir);
                File.Copy(file, target, true);
            }
        }

        private static void ClearDir(string dir)
        {
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
                return;
            }
            foreach (string f in Directory.GetFiles(dir, "*", SearchOption.TopDirectoryOnly))
            {
                try { File.SetAttributes(f, FileAttributes.Normal); File.Delete(f); } catch { }
            }
            foreach (string d in Directory.GetDirectories(dir, "*", SearchOption.TopDirectoryOnly))
            {
                try { Directory.Delete(d, true); } catch { }
            }
        }

        private static void Measure(string dir, out long bytes, out int count)
        {
            bytes = 0;
            count = 0;
            try
            {
                foreach (string f in Directory.GetFiles(dir, "*", SearchOption.AllDirectories))
                {
                    try { bytes += new FileInfo(f).Length; count++; } catch { }
                }
            }
            catch { }
        }

        public static long DirSize(string dir)
        {
            long b;
            int c;
            Measure(dir, out b, out c);
            return b;
        }
    }
}
