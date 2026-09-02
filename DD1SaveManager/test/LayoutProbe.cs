using System;
using System.Drawing;
using System.Reflection;
using System.Windows.Forms;

namespace DD1SaveManager
{
    // 布局探针：启动主窗体，在默认尺寸和小尺寸下验证操作按钮与选项条不被裁剪。
    internal static class LayoutProbe
    {
        private static int _passed;

        private static void Check(bool cond, string name)
        {
            if (!cond) throw new ApplicationException("布局检查失败: " + name);
            _passed++;
            Console.WriteLine("[PASS] " + name);
        }

        private static object GetField(object obj, string name)
        {
            FieldInfo f = obj.GetType().GetField(name, BindingFlags.NonPublic | BindingFlags.Instance);
            return f == null ? null : f.GetValue(obj);
        }

        private static void VerifyLayout(Form form)
        {
            Application.DoEvents();
            form.Refresh();
            Application.DoEvents();

            Control btnLaunch = (Control)GetField(form, "btnLaunch");
            Control numKeep = (Control)GetField(form, "numKeep");

            Check(btnLaunch != null && numKeep != null, "控件已创建");
            if (btnLaunch == null || numKeep == null) return;

            // btnLaunch → flow(按钮面板) → grpOps(操作分组)
            Control grpOps = btnLaunch.Parent != null ? btnLaunch.Parent.Parent : null;
            Check(grpOps != null, "找到操作分组");

            // 诊断：打印真实几何数据
            FlowLayoutPanel fl = (FlowLayoutPanel)btnLaunch.Parent;
            Rectangle btnInForm = form.RectangleToClient(btnLaunch.Parent.RectangleToScreen(btnLaunch.Bounds));
            Console.WriteLine(string.Format(
                "[diag] form={0}x{1} grpOps={2} flow={3} btnInForm={4} pref@{5}={6} pref@max={7}",
                form.ClientSize.Width, form.ClientSize.Height,
                grpOps.Bounds, fl.Bounds, btnInForm,
                grpOps.ClientSize.Width - 12,
                fl.GetPreferredSize(new Size(grpOps.ClientSize.Width - 12, int.MaxValue)),
                fl.GetPreferredSize(new Size(int.MaxValue, int.MaxValue))));

            // 底部操作区整体在窗口客户区内
            Check(grpOps.Top >= 0 && grpOps.Bottom <= form.ClientSize.Height + 1,
                string.Format("操作区在窗口内 (Bottom={0}, Client={1})", grpOps.Bottom, form.ClientSize.Height));
            // 启动游戏按钮完整落在操作区内（用窗口坐标系比较）
            Check(btnInForm.Top >= grpOps.Top && btnInForm.Bottom <= grpOps.Bottom + 1,
                string.Format("按钮完整可见 (btnInForm={0}, grp Top/Bottom={1}/{2})", btnInForm, grpOps.Top, grpOps.Bottom));
            Check(btnLaunch.Right <= grpOps.Right + 1, "按钮未被右侧裁剪");
            // 选项条（保留数量等）在其父容器内
            Control strip = numKeep.Parent;
            Control stripHost = strip.Parent;
            Check(stripHost != null && strip.Bottom <= stripHost.Bottom + 1,
                string.Format("选项条完整可见 (strip Bottom={0}, host Bottom={1})", strip.Bottom, stripHost.Bottom));
        }

        [STAThread]
        private static int Main()
        {
            try
            {
                Console.WriteLine("== DD1SaveManager Layout Probe ==");
                Form form = new MainForm();
                form.Show();
                VerifyLayout(form);
                Check(form.WindowState == FormWindowState.Normal, "默认非最大化");

                // 缩小窗口再验一遍（模拟手动拖小）
                form.Size = new Size(880, 600);
                VerifyLayout(form);
                // 拉高窗口再验一遍（模拟手动拖大）
                form.Size = new Size(1200, 900);
                VerifyLayout(form);

                // 模拟高分屏：OnShown 的 DPI 缩放路径（x2），验证缩放后操作区仍完整
                form.Size = new Size(1000, 680);
                Application.DoEvents();
                Control grpOpsPre = (Control)GetField(form, "btnBackup");
                grpOpsPre = grpOpsPre.Parent.Parent;
                Console.WriteLine("[2x] 缩放前 grpOps=" + grpOpsPre.Bounds);
                form.Scale(new SizeF(2f, 2f));
                Application.DoEvents();
                Console.WriteLine("[2x] 缩放后 grpOps=" + grpOpsPre.Bounds + " flow=" + grpOpsPre.Controls[0].Bounds);
                MethodInfo upd = form.GetType().GetMethod("UpdateOpsHeight", BindingFlags.NonPublic | BindingFlags.Instance);
                upd.Invoke(form, null);
                Application.DoEvents();
                Console.WriteLine("[2x] 手动重算后 grpOps=" + grpOpsPre.Bounds);
                form.MinimumSize = new Size(1760, 1200);
                VerifyLayout(form);

                Console.WriteLine("== 布局全部通过: " + _passed + " 项 ==");
                form.Close();
                return 0;
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
