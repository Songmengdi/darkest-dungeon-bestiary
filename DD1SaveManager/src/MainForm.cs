using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace DD1SaveManager
{
    public class SlotItem
    {
        public string Slot;
        public SlotItem(string slot) { Slot = slot; }
        public override string ToString()
        {
            return "插槽 " + (SaveService.SlotNumber(Slot) + 1) + "   (" + Slot + ")";
        }
    }

    public class MainForm : Form
    {
        private AppSettings _settings;

        private TextBox txtSave;
        private TextBox txtBackup;
        private Button btnBrowseSave;
        private Button btnBrowseBackup;
        private ListBox lstSlots;
        private Label lblSlotInfo;
        private ListView lstBackups;
        private TextBox txtLabel;
        private CheckBox chkPreBackup;
        private NumericUpDown numKeep;
        private Button btnBackup;
        private Button btnRestore;
        private Button btnDelete;
        private Button btnClone;
        private Button btnBackupAll;
        private Button btnOpenSave;
        private Button btnOpenBackup;
        private Button btnLaunch;
        private ToolStripStatusLabel lblStatus;
        private bool _loading;

        public MainForm()
        {
            _settings = SettingsStore.Load();
            InitUi();
            LoadSettingsToUi();
            RefreshAll();
        }

        private bool _dpiScaled;

        /// <summary>
        /// 高分屏下把整个界面按窗口所在显示器的真实 DPI 同比放大。
        /// app.manifest 已声明 dpiAware：字体随窗口实际 DPI 渲染，
        /// 而窗口/控件坐标仍是 96-DPI 设计值，必须在显示后手动放大一次。
        /// </summary>
        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            if (_dpiScaled) return;
            _dpiScaled = true;
            float dpi;
            using (Graphics g = Graphics.FromHwnd(Handle)) { dpi = g.DpiX; }
            float factor = dpi / 96f;
            if (factor <= 1.01f) return;
            Scale(new SizeF(factor, factor));
            // Scale 期间布局挂起，SizeChanged 路径的高度重算不可靠，显式补算两次（立即 + 布局恢复后）
            UpdateOpsHeight();
            BeginInvoke((MethodInvoker)delegate { UpdateOpsHeight(); });
            foreach (ColumnHeader ch in lstBackups.Columns)
            {
                ch.Width = (int)(ch.Width * factor);
            }
            Rectangle wa = Screen.GetWorkingArea(this);
            MinimumSize = new Size(
                Math.Min((int)(880 * factor), wa.Width),
                Math.Min((int)(600 * factor), wa.Height));
        }

        // ================= UI 构建 =================

        private void InitUi()
        {
            Font = new Font("Microsoft YaHei UI", 9F);
            Text = "暗黑地牢1 本地存档管理器";
            Size = new Size(1000, 680);
            MinimumSize = new Size(880, 600);
            StartPosition = FormStartPosition.CenterScreen;

            // 顶部：两个路径
            var pnlTop = new TableLayoutPanel();
            pnlTop.Dock = DockStyle.Top;
            pnlTop.AutoSize = true;
            pnlTop.Padding = new Padding(8, 6, 8, 2);
            pnlTop.ColumnCount = 3;
            pnlTop.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            pnlTop.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            pnlTop.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            pnlTop.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            pnlTop.RowStyles.Add(new RowStyle(SizeType.AutoSize));

            var lbl1 = new Label();
            lbl1.Text = "存档根目录:";
            lbl1.AutoSize = true;
            lbl1.Anchor = AnchorStyles.Left;
            lbl1.Margin = new Padding(2, 6, 8, 2);
            txtSave = new TextBox();
            txtSave.Dock = DockStyle.Fill;
            txtSave.Margin = new Padding(2, 8, 2, 2);
            txtSave.TextChanged += delegate { UpdateButtonStates(); };
            btnBrowseSave = new Button();
            btnBrowseSave.Text = "浏览...";
            btnBrowseSave.Dock = DockStyle.Fill;
            btnBrowseSave.Margin = new Padding(2, 4, 2, 4);
            btnBrowseSave.Click += delegate { BrowseFolder(txtSave, "选择存档根目录 (remote)"); };

            var lbl2 = new Label();
            lbl2.Text = "备份目录:";
            lbl2.AutoSize = true;
            lbl2.Anchor = AnchorStyles.Left;
            lbl2.Margin = new Padding(2, 6, 8, 2);
            txtBackup = new TextBox();
            txtBackup.Dock = DockStyle.Fill;
            txtBackup.Margin = new Padding(2, 8, 2, 2);
            btnBrowseBackup = new Button();
            btnBrowseBackup.Text = "浏览...";
            btnBrowseBackup.Dock = DockStyle.Fill;
            btnBrowseBackup.Margin = new Padding(2, 4, 2, 4);
            btnBrowseBackup.Click += delegate { BrowseFolder(txtBackup, "选择备份存放目录"); };

            pnlTop.Controls.Add(lbl1, 0, 0);
            pnlTop.Controls.Add(txtSave, 1, 0);
            pnlTop.Controls.Add(btnBrowseSave, 2, 0);
            pnlTop.Controls.Add(lbl2, 0, 1);
            pnlTop.Controls.Add(txtBackup, 1, 1);
            pnlTop.Controls.Add(btnBrowseBackup, 2, 1);

            // 左侧：插槽列表
            var grpSlots = new GroupBox();
            grpSlots.Text = "存档插槽";
            grpSlots.Dock = DockStyle.Left;
            grpSlots.Width = 250;
            grpSlots.Padding = new Padding(6);

            lblSlotInfo = new Label();
            lblSlotInfo.Dock = DockStyle.Bottom;
            lblSlotInfo.AutoSize = true;
            lblSlotInfo.TextAlign = ContentAlignment.TopLeft;
            lblSlotInfo.ForeColor = Color.DimGray;
            lblSlotInfo.Text = "";

            lstSlots = new ListBox();
            lstSlots.Dock = DockStyle.Fill;
            lstSlots.Font = new Font("Microsoft YaHei UI", 10F);
            lstSlots.SelectedIndexChanged += delegate { RefreshBackups(); UpdateButtonStates(); };

            grpSlots.Controls.Add(lstSlots);
            grpSlots.Controls.Add(lblSlotInfo);

            // 底部：操作按钮
            var grpOps = new GroupBox();
            grpOps.Text = "操作";
            grpOps.Dock = DockStyle.Bottom;
            grpOps.Padding = new Padding(4, 0, 4, 4);
            grpOps.SizeChanged += delegate { UpdateOpsHeight(); };

            var flow = new FlowLayoutPanel();
            flow.Dock = DockStyle.Fill;
            flow.WrapContents = true;
            flow.Padding = new Padding(2, 4, 2, 2);

            var lblNote = new Label();
            lblNote.Text = "备份备注:";
            lblNote.AutoSize = true;
            lblNote.Margin = new Padding(2, 8, 0, 0);

            txtLabel = new TextBox();
            txtLabel.Width = 150;
            txtLabel.Margin = new Padding(2, 4, 8, 2);

            btnBackup = MakeOpButton("备份选中插槽", delegate { DoBackup(); });
            btnRestore = MakeOpButton("恢复选中备份", delegate { DoRestore(); });
            btnDelete = MakeOpButton("删除备份", delegate { DoDelete(); });
            btnClone = MakeOpButton("克隆到其他插槽...", delegate { DoClone(); });
            btnBackupAll = MakeOpButton("全部插槽备份", delegate { DoBackupAll("手动整包备份"); });
            btnOpenSave = MakeOpButton("打开存档目录", delegate { OpenFolder(txtSave.Text); });
            btnOpenBackup = MakeOpButton("打开备份目录", delegate { OpenBackupDir(); });
            btnLaunch = MakeOpButton("启动游戏", delegate { LaunchGame(); });

            flow.Controls.Add(lblNote);
            flow.Controls.Add(txtLabel);
            flow.Controls.Add(btnBackup);
            flow.Controls.Add(btnRestore);
            flow.Controls.Add(btnDelete);
            flow.Controls.Add(btnClone);
            flow.Controls.Add(btnBackupAll);
            flow.Controls.Add(btnOpenSave);
            flow.Controls.Add(btnOpenBackup);
            flow.Controls.Add(btnLaunch);
            grpOps.Controls.Add(flow);

            // 右侧：备份列表
            var grpBackups = new GroupBox();
            grpBackups.Text = "备份列表";
            grpBackups.Dock = DockStyle.Fill;
            grpBackups.Padding = new Padding(6);

            lstBackups = new ListView();
            lstBackups.Dock = DockStyle.Fill;
            lstBackups.View = View.Details;
            lstBackups.FullRowSelect = true;
            lstBackups.MultiSelect = false;
            lstBackups.HideSelection = false;
            lstBackups.Columns.Add("时间", 170);
            lstBackups.Columns.Add("备注", 240);
            lstBackups.Columns.Add("大小", 110, HorizontalAlignment.Right);
            lstBackups.Columns.Add("文件数", 90, HorizontalAlignment.Right);
            lstBackups.Columns.Add("文件夹名", 300);
            lstBackups.SelectedIndexChanged += delegate { UpdateButtonStates(); };
            lstBackups.DoubleClick += delegate { OpenSelectedBackupFolder(); };

            var pnlOpts = new FlowLayoutPanel();
            pnlOpts.Dock = DockStyle.Top;
            pnlOpts.AutoSize = true;
            pnlOpts.WrapContents = true;
            pnlOpts.Padding = new Padding(2, 4, 2, 2);

            var lblKeep = new Label();
            lblKeep.Text = "每插槽保留";
            lblKeep.AutoSize = true;
            lblKeep.Margin = new Padding(3, 10, 0, 0);

            numKeep = new NumericUpDown();
            numKeep.Minimum = 0;
            numKeep.Maximum = 500;
            numKeep.Width = 64;
            numKeep.Margin = new Padding(3, 6, 3, 0);
            numKeep.ValueChanged += delegate { SaveSettingsFromUi(); };

            var lblKeep2 = new Label();
            lblKeep2.Text = "份 (0=不限制)";
            lblKeep2.AutoSize = true;
            lblKeep2.Margin = new Padding(3, 10, 12, 0);

            chkPreBackup = new CheckBox();
            chkPreBackup.Text = "恢复前自动备份当前存档";
            chkPreBackup.AutoSize = true;
            chkPreBackup.Margin = new Padding(3, 7, 3, 0);
            chkPreBackup.CheckedChanged += delegate { SaveSettingsFromUi(); };

            pnlOpts.Controls.Add(lblKeep);
            pnlOpts.Controls.Add(numKeep);
            pnlOpts.Controls.Add(lblKeep2);
            pnlOpts.Controls.Add(chkPreBackup);

            grpBackups.Controls.Add(lstBackups);
            grpBackups.Controls.Add(pnlOpts);

            // 状态栏
            var status = new StatusStrip();
            lblStatus = new ToolStripStatusLabel();
            lblStatus.Text = "就绪";
            lblStatus.Spring = true;
            lblStatus.TextAlign = ContentAlignment.MiddleLeft;
            status.Items.Add(lblStatus);

            // 加入顺序：先 Fill，后边缘，保证停靠正确
            Controls.Add(grpBackups);
            Controls.Add(pnlTop);
            Controls.Add(grpOps);
            Controls.Add(grpSlots);
            Controls.Add(status);
            UpdateOpsHeight();
        }

        /// <summary>按当前窗口宽度计算底部按钮区换行后的高度，保证按钮完整可见。</summary>
        private void UpdateOpsHeight()
        {
            if (btnBackup == null || btnBackup.Parent == null || btnBackup.Parent.Parent == null) return;
            GroupBox grpOps = (GroupBox)btnBackup.Parent.Parent;
            FlowLayoutPanel fl = (FlowLayoutPanel)btnBackup.Parent;
            int innerW = grpOps.ClientSize.Width - grpOps.Padding.Left - grpOps.Padding.Right - 8;
            if (innerW < 50) innerW = 50;
            Size pref = fl.GetPreferredSize(new Size(innerW, int.MaxValue));
            int chrome = grpOps.Height - grpOps.DisplayRectangle.Height; // 标题与边框占用的固定高度
            int newH = pref.Height + grpOps.Padding.Top + grpOps.Padding.Bottom + chrome;
            if (newH < 40) newH = 40;
            if (Math.Abs(grpOps.Height - newH) >= 2) grpOps.Height = newH;
        }

        protected override void OnClientSizeChanged(EventArgs e)
        {
            base.OnClientSizeChanged(e);
            UpdateOpsHeight();
        }

        private Button MakeOpButton(string text, EventHandler onClick)
        {
            var b = new Button();
            b.Text = text;
            b.AutoSize = true;
            b.MinimumSize = new Size(96, 28);
            b.Margin = new Padding(2, 4, 2, 2);
            b.Click += onClick;
            return b;
        }

        // ================= 设置 =================

        private void LoadSettingsToUi()
        {
            // 控件赋值会触发 Changed 事件；加载期间禁止把中间状态写回设置
            _loading = true;
            try
            {
                txtSave.Text = _settings.SaveRoot;
                txtBackup.Text = _settings.BackupRoot;
                numKeep.Value = _settings.KeepPerSlot;
                chkPreBackup.Checked = _settings.PreBackupOnRestore;
            }
            finally
            {
                _loading = false;
            }
        }

        private AppSettings ReadSettingsFromUi()
        {
            var s = new AppSettings();
            s.SaveRoot = txtSave.Text.Trim();
            s.BackupRoot = txtBackup.Text.Trim();
            s.KeepPerSlot = (int)numKeep.Value;
            s.PreBackupOnRestore = chkPreBackup.Checked;
            return s;
        }

        private void SaveSettingsFromUi()
        {
            if (_loading) return;
            _settings = ReadSettingsFromUi();
            SettingsStore.Save(_settings);
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            SaveSettingsFromUi();
            base.OnFormClosing(e);
        }

        // ================= 刷新 =================

        private void RefreshAll()
        {
            RefreshSlots();
        }

        private void RefreshSlots()
        {
            string sel = CurrentSlot();
            lstSlots.BeginUpdate();
            lstSlots.Items.Clear();
            try
            {
                List<string> slots = SaveService.FindSlots(txtSave.Text.Trim());
                foreach (string s in slots) lstSlots.Items.Add(new SlotItem(s));
            }
            catch { }
            lstSlots.EndUpdate();
            // 尽量保持原选择
            if (sel != null)
            {
                foreach (object it in lstSlots.Items)
                {
                    if (((SlotItem)it).Slot == sel) { lstSlots.SelectedItem = it; break; }
                }
            }
            if (lstSlots.SelectedIndex < 0 && lstSlots.Items.Count > 0) lstSlots.SelectedIndex = 0;
            if (lstSlots.Items.Count == 0)
            {
                lblSlotInfo.Text = "未找到任何 profile_N 插槽。\n请检查存档根目录是否正确。";
            }
        }

        private string CurrentSlot()
        {
            var it = lstSlots.SelectedItem as SlotItem;
            return it == null ? null : it.Slot;
        }

        private BackupInfo CurrentBackup()
        {
            if (lstBackups.SelectedItems.Count == 0) return null;
            return lstBackups.SelectedItems[0].Tag as BackupInfo;
        }

        private void RefreshBackups()
        {
            string slot = CurrentSlot();
            lstBackups.BeginUpdate();
            lstBackups.Items.Clear();
            if (slot != null)
            {
                try
                {
                    List<BackupInfo> list = SaveService.ListBackups(txtBackup.Text.Trim(), slot);
                    foreach (BackupInfo b in list)
                    {
                        var item = new ListViewItem(b.Created.ToString("yyyy-MM-dd HH:mm:ss"));
                        item.SubItems.Add(b.Label);
                        item.SubItems.Add(FormatBytes(b.Bytes));
                        item.SubItems.Add(b.FileCount.ToString());
                        item.SubItems.Add(b.Name);
                        item.Tag = b;
                        lstBackups.Items.Add(item);
                    }
                    lblSlotInfo.Text = string.Format(
                        "目录: {0}\r\n大小: {1} ({2} 文件)\r\n备份: {3} 份\r\n最近: {4}",
                        slot, FormatBytes(SaveService.DirSize(Path.Combine(txtSave.Text.Trim(), slot))),
                        CountFiles(Path.Combine(txtSave.Text.Trim(), slot)), list.Count,
                        list.Count > 0 ? list[0].Created.ToString("MM-dd HH:mm") : "无");
                }
                catch (Exception ex)
                {
                    lblSlotInfo.Text = "读取备份失败: " + ex.Message;
                }
            }
            else
            {
                lblSlotInfo.Text = "未选中插槽";
            }
            lstBackups.EndUpdate();
            UpdateButtonStates();
        }

        private static int CountFiles(string dir)
        {
            if (!Directory.Exists(dir)) return 0;
            try { return Directory.GetFiles(dir, "*", SearchOption.AllDirectories).Length; }
            catch { return 0; }
        }

        private static string FormatBytes(long b)
        {
            if (b < 1024) return b + " B";
            if (b < 1024 * 1024) return (b / 1024d).ToString("0.#") + " KB";
            return (b / 1024d / 1024d).ToString("0.##") + " MB";
        }

        private void UpdateButtonStates()
        {
            bool hasSlot = CurrentSlot() != null;
            bool hasBackup = CurrentBackup() != null;
            btnBackup.Enabled = hasSlot && txtSave.Text.Trim().Length > 0;
            btnBackupAll.Enabled = hasSlot;
            btnRestore.Enabled = hasSlot && hasBackup;
            btnDelete.Enabled = hasSlot && hasBackup;
            btnClone.Enabled = hasSlot && hasBackup;
            btnOpenSave.Enabled = txtSave.Text.Trim().Length > 0;
            btnOpenBackup.Enabled = txtBackup.Text.Trim().Length > 0;
        }

        private void SetStatus(string msg)
        {
            lblStatus.Text = DateTime.Now.ToString("HH:mm:ss") + "  " + msg;
        }

        // ================= 操作 =================

        private void BrowseFolder(TextBox target, string desc)
        {
            using (var dlg = new FolderBrowserDialog())
            {
                dlg.Description = desc;
                dlg.ShowNewFolderButton = true;
                if (Directory.Exists(target.Text)) dlg.SelectedPath = target.Text;
                if (dlg.ShowDialog(this) == DialogResult.OK)
                {
                    target.Text = dlg.SelectedPath;
                    SaveSettingsFromUi();
                    if (target == txtSave) RefreshSlots();
                }
            }
        }

        private void DoBackup()
        {
            string slot = CurrentSlot();
            if (slot == null) return;
            try
            {
                SaveSettingsFromUi();
                SaveService.Backup(txtSave.Text.Trim(), txtBackup.Text.Trim(), slot,
                    txtLabel.Text, (int)numKeep.Value);
                SetStatus("已备份 " + slot + (txtLabel.Text.Trim().Length > 0 ? "（" + txtLabel.Text.Trim() + "）" : ""));
                RefreshBackups();
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "备份失败：\n" + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void DoBackupAll(string label)
        {
            try
            {
                SaveSettingsFromUi();
                List<string> slots = SaveService.FindSlots(txtSave.Text.Trim());
                if (slots.Count == 0) { SetStatus("没有可备份的插槽"); return; }
                int ok = 0;
                foreach (string s in slots)
                {
                    SaveService.Backup(txtSave.Text.Trim(), txtBackup.Text.Trim(), s, label, (int)numKeep.Value);
                    ok++;
                }
                SetStatus("整包备份完成：" + ok + " 个插槽");
                RefreshBackups();
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "整包备份失败：\n" + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void DoRestore()
        {
            string slot = CurrentSlot();
            BackupInfo b = CurrentBackup();
            if (slot == null || b == null) return;

            if (SaveService.IsGameRunning())
            {
                MessageBox.Show(this,
                    "检测到暗黑地牢正在运行。\n\n恢复存档前请先完全退出游戏，否则可能损坏存档。",
                    "游戏正在运行", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string msg;
            MessageBoxIcon icon = MessageBoxIcon.Question;
            if (chkPreBackup.Checked)
            {
                msg = string.Format(
                    "确定用备份\n\n  {0}  ({1})\n\n覆盖插槽  {2}  吗？\n\n当前存档会先自动备份一份（恢复前自动备份已开启）。",
                    b.Created.ToString("yyyy-MM-dd HH:mm:ss"), b.Label.Length > 0 ? b.Label : "无备注", slot);
            }
            else
            {
                msg = string.Format(
                    "确定用备份\n\n  {0}  ({1})\n\n覆盖插槽  {2}  吗？\n\n注意：未开启恢复前自动备份，当前存档将被直接覆盖！",
                    b.Created.ToString("yyyy-MM-dd HH:mm:ss"), b.Label.Length > 0 ? b.Label : "无备注", slot);
                icon = MessageBoxIcon.Warning;
            }
            if (MessageBox.Show(this, msg, "确认恢复", MessageBoxButtons.YesNo, icon) != DialogResult.Yes)
                return;

            try
            {
                if (chkPreBackup.Checked)
                {
                    SaveService.Backup(txtSave.Text.Trim(), txtBackup.Text.Trim(), slot, "恢复前自动备份", (int)numKeep.Value);
                }
                string target = Path.Combine(txtSave.Text.Trim(), slot);
                SaveService.Restore(b.DirPath, target);
                SetStatus("已恢复 " + slot + " ← " + b.Name);
                RefreshBackups();
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "恢复失败：\n" + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void DoDelete()
        {
            BackupInfo b = CurrentBackup();
            if (b == null) return;
            if (MessageBox.Show(this,
                "确定删除这份备份吗？\n\n" + b.Name + "\n" + b.Created.ToString("yyyy-MM-dd HH:mm:ss"),
                "确认删除", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes)
                return;
            try
            {
                SaveService.DeleteBackup(b.DirPath);
                SetStatus("已删除备份 " + b.Name);
                RefreshBackups();
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "删除失败：\n" + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void DoClone()
        {
            string slot = CurrentSlot();
            BackupInfo b = CurrentBackup();
            if (slot == null || b == null) return;

            if (SaveService.IsGameRunning())
            {
                MessageBox.Show(this, "检测到暗黑地牢正在运行，请先完全退出游戏。", "游戏正在运行",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string target;
            if (!ShowCloneDialog(slot, out target)) return;

            bool targetExists = Directory.Exists(Path.Combine(txtSave.Text.Trim(), target));
            string msg = string.Format(
                "把备份 {0}\n克隆到插槽 {1} ({2}) ？\n\n{3}",
                b.Name, target, "插槽 " + (SaveService.SlotNumber(target) + 1),
                targetExists ? "该插槽已有存档，会先自动备份一份再覆盖。" : "这是新插槽，将直接创建。");
            if (MessageBox.Show(this, msg, "确认克隆", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            try
            {
                SaveService.CloneBackupToSlot(b.DirPath, txtSave.Text.Trim(), target,
                    txtBackup.Text.Trim(), (int)numKeep.Value);
                SetStatus("已把备份克隆到 " + target);
                RefreshSlots();
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "克隆失败：\n" + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private bool ShowCloneDialog(string fromSlot, out string targetSlot)
        {
            targetSlot = null;
            using (var dlg = new Form())
            {
                dlg.Text = "克隆到其他插槽";
                dlg.FormBorderStyle = FormBorderStyle.FixedDialog;
                dlg.StartPosition = FormStartPosition.CenterParent;
                dlg.ClientSize = new Size(340, 130);
                dlg.MaximizeBox = false;
                dlg.MinimizeBox = false;

                var lbl = new Label();
                lbl.Text = "目标插槽（profile_N）：";
                lbl.Location = new Point(14, 14);
                lbl.AutoSize = true;

                var combo = new ComboBox();
                combo.DropDownStyle = ComboBoxStyle.DropDown;
                combo.Location = new Point(16, 36);
                combo.Width = 300;
                foreach (string s in SaveService.FindSlots(txtSave.Text.Trim()))
                {
                    if (s != fromSlot) combo.Items.Add(s);
                }

                var ok = new Button();
                ok.Text = "确定";
                ok.DialogResult = DialogResult.OK;
                ok.Location = new Point(160, 88);
                ok.Width = 70;

                var cancel = new Button();
                cancel.Text = "取消";
                cancel.DialogResult = DialogResult.Cancel;
                cancel.Location = new Point(246, 88);
                cancel.Width = 70;

                dlg.Controls.Add(lbl);
                dlg.Controls.Add(combo);
                dlg.Controls.Add(ok);
                dlg.Controls.Add(cancel);
                dlg.AcceptButton = ok;
                dlg.CancelButton = cancel;

                if (dlg.ShowDialog(this) != DialogResult.OK) return false;
                string t = combo.Text.Trim();
                if (!Regex.IsMatch(t, @"^profile_\d+$"))
                {
                    MessageBox.Show(this, "插槽名必须是 profile_数字，例如 profile_2。", "无效输入",
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return false;
                }
                targetSlot = t;
                return true;
            }
        }

        private void OpenFolder(string path)
        {
            path = (path ?? "").Trim();
            if (path.Length == 0 || !Directory.Exists(path))
            {
                MessageBox.Show(this, "目录不存在：\n" + path, "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            try { Process.Start(path); } catch { }
        }

        private void OpenBackupDir()
        {
            BackupInfo b = CurrentBackup();
            if (b != null && Directory.Exists(b.DirPath))
            {
                try { Process.Start(b.DirPath); } catch { }
                return;
            }
            OpenFolder(txtBackup.Text);
        }

        private void OpenSelectedBackupFolder()
        {
            OpenBackupDir();
        }

        private void LaunchGame()
        {
            try
            {
                Process.Start("steam://rungameid/262060");
                SetStatus("已请求 Steam 启动暗黑地牢");
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "启动失败（需要安装 Steam）：\n" + ex.Message, "错误",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
