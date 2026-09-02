using System;
using System.IO;
using System.Web.Script.Serialization;

namespace DD1SaveManager
{
    public class AppSettings
    {
        public string SaveRoot { get; set; }
        public string BackupRoot { get; set; }
        public int KeepPerSlot { get; set; }
        public bool PreBackupOnRestore { get; set; }
    }

    public static class SettingsStore
    {
        public static string FilePath
        {
            get { return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "settings.json"); }
        }

        public static AppSettings Load()
        {
            var s = new AppSettings();
            s.SaveRoot = @"D:\software\steam\userdata\923728202\262060\remote";
            s.BackupRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "backups");
            s.KeepPerSlot = 20;
            s.PreBackupOnRestore = true;
            try
            {
                if (File.Exists(FilePath))
                {
                    var loaded = new JavaScriptSerializer().Deserialize<AppSettings>(File.ReadAllText(FilePath));
                    if (loaded != null)
                    {
                        if (!string.IsNullOrEmpty(loaded.SaveRoot)) s.SaveRoot = loaded.SaveRoot;
                        if (!string.IsNullOrEmpty(loaded.BackupRoot)) s.BackupRoot = loaded.BackupRoot;
                        if (loaded.KeepPerSlot >= 0) s.KeepPerSlot = loaded.KeepPerSlot;
                        s.PreBackupOnRestore = loaded.PreBackupOnRestore;
                    }
                }
            }
            catch { }
            return s;
        }

        public static void Save(AppSettings s)
        {
            try
            {
                File.WriteAllText(FilePath, new JavaScriptSerializer().Serialize(s));
            }
            catch { }
        }
    }
}
