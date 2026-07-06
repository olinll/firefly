---
title: Ubuntu安装IntelliJ IDEA
slug: ubuntu-install-intellij-idea
published: 2025-03-03 00:00:00
updated: 2025-03-03 00:00:00
description: 详解在 Ubuntu 系统下安装 IntelliJ IDEA 的标准流程，涵盖手动解压安装、创建桌面快捷方式及全局环境变量配置。
image: api
category: 开发
tags: ["IntelliJ", "IDEA", "Ubuntu", "开发环境"]
draft: false
# pinned: false
---

## 📝 前言

IntelliJ IDEA 是 Java 开发的首选 IDE，本文将详细介绍如何在 Ubuntu 系统中安装 IDEA，并完成桌面应用配置和环境变量设置。

**环境说明**：

- 操作系统：Ubuntu 22.04 LTS / 24.04 LTS
- IDEA 版本：IntelliJ IDEA 2024.3.3 (或最新版)
- 安装位置：`/opt/idea`

---

## 一、下载 IntelliJ IDEA

### 1.1 获取安装包

访问 [JetBrains 官方网站](https://www.jetbrains.com/idea/download/) 下载 Linux 版本：

- **Community Edition**（社区版）：免费开源，选择 `.tar.gz` 格式
- **Ultimate Edition**（旗舰版）：付费，功能更全

### 1.2 下载到本地

```bash
# 进入下载目录
cd ~/Downloads

# 如果使用 wget 下载（以 2024.3.3 版本为例）
wget https://download.jetbrains.com/idea/ideaIC-2024.3.3.tar.gz
```

---

## 二、安装 IDEA 到 /opt 目录

### 2.1 解压并移动文件

```bash
# 解压下载的文件
tar -xzf ideaIC-2024.3.3.tar.gz

# 创建目标目录（需要 sudo）
sudo mkdir -p /opt/idea

# 移动解压后的文件到 /opt/idea
sudo mv idea-IC-243.23626.103/* /opt/idea/

# 修改所有权，让当前用户可以读写
sudo chown -R $USER:$USER /opt/idea
sudo chmod -R 755 /opt/idea
```

> **为什么要装到 /opt？**
> - `/opt` 是 Linux 系统中存放第三方软件的标准目录
> - 与其他系统软件隔离，便于管理

### 2.2 验证安装

```bash
# 尝试启动 IDEA
/opt/idea/bin/idea.sh
```

如果能正常启动，说明安装成功。

---

## 三、配置环境变量

为了方便在终端中启动 IDEA，添加环境变量：

### 3.1 编辑配置文件

```bash
# 编辑 bash 配置文件
nano ~/.bashrc
```

### 3.2 在文件末尾添加

```bash
# IntelliJ IDEA
export IDEA_HOME=/opt/idea
export PATH=$PATH:$IDEA_HOME/bin
```

### 3.3 使配置生效

```bash
source ~/.bashrc
```

### 3.4 测试环境变量

```bash
# 现在可以直接用命令启动
idea.sh
```

---

## 四、创建桌面快捷方式

### 4.1 创建桌面配置文件

```bash
# 为当前用户创建桌面快捷方式
nano ~/.local/share/applications/idea.desktop
```

### 4.2 写入配置内容

```ini
[Desktop Entry]
Encoding=UTF-8
Version=1.0
Name=IntelliJ IDEA
GenericName=Java IDE
Comment=IntelliJ IDEA - 强大的 Java 集成开发环境
Exec=/opt/idea/bin/idea %f
Icon=/opt/idea/bin/idea.png
Terminal=false
Type=Application
Categories=Development;IDE;
StartupWMClass=jetbrains-idea
StartupNotify=true
Keywords=java;ide;development;programming
```

### 4.3 ⚠️ 重要：为什么用 `idea` 而不是 `idea.sh`？

很多初学者会疑惑：bin 目录下有两个可执行文件 `idea` 和 `idea.sh`，该用哪个？

| 文件 | 类型 | 特点 | 适用场景 |
|:---|:---|:---|:---|
| `idea` | 二进制启动器 | - **静默启动**，无日志输出<br>- 不占用终端窗口<br>- 启动更快 | **桌面快捷方式（推荐）**、日常使用 |
| `idea.sh` | Shell 脚本 | - 显示详细启动日志<br>- **会打开终端窗口**<br>- 关闭终端会导致 IDEA 退出 | 调试启动问题、查看错误日志 |

**简单来说**：

- 双击桌面图标时，你肯定不希望弹出一个黑乎乎的终端窗口——所以用 `idea`
- 如果 IDEA 启动失败需要看错误信息，才用 `idea.sh`

验证一下：

```bash
# 对比两种启动方式
/opt/idea/bin/idea      # 静默启动，终端立即返回
/opt/idea/bin/idea.sh   # 占用终端，显示日志
```

### 4.4 各字段说明

| 字段 | 作用 |
|:---|:---|
| `Name` | 应用菜单中显示的名称 |
| `Exec` | 启动命令，`%f` 支持从文件管理器打开文件 |
| `Icon` | 图标文件路径 |
| `Categories` | 应用菜单中的分类 |
| `StartupWMClass` | 让任务栏正确分组图标 |
| `Keywords` | 搜索关键词，方便查找 |

### 4.5 验证图标文件

```bash
# 检查图标文件是否存在
ls -l /opt/idea/bin/idea.png

# 如果不存在，查找实际图标
find /opt/idea/bin -name "*.png" -o -name "*.svg"
```

如果图标文件名不同（如 `idea.svg`），修改 `Icon=` 行的文件名。

### 4.6 更新桌面数据库

```bash
update-desktop-database ~/.local/share/applications/
```

---

## 五、测试配置

### 5.1 从应用菜单启动

- 点击 Ubuntu 左下角的"显示应用程序"
- 搜索 "IntelliJ IDEA"
- 点击图标启动（此时使用的是静默的 `idea` 命令）

### 5.2 从命令行启动

```bash
# 使用环境变量启动（静默）
idea

# 或使用带日志版本（调试用）
idea.sh

# 或使用完整路径
/opt/idea/bin/idea
/opt/idea/bin/idea.sh
```

### 5.3 测试文件关联

在文件管理器中选中一个 Java 文件，右键 → 选择"用其他应用打开" → 找到 IntelliJ IDEA，应该能正常打开。

---

## 六、常见问题排查

### 6.1 权限不够

```bash
# 如果出现权限错误
sudo chown -R $USER:$USER /opt/idea
sudo chmod -R 755 /opt/idea
```

### 6.2 图标不显示

- 检查图标文件路径是否正确
- 尝试使用 `.svg` 格式的图标
- 确认文件名大小写

### 6.3 无法从菜单找到

```bash
# 重新更新桌面数据库
sudo update-desktop-database /usr/share/applications/
update-desktop-database ~/.local/share/applications/
```

### 6.4 环境变量不生效

```bash
# 重新加载配置
source ~/.bashrc

# 或重启终端
```

---

## 七、进阶配置

### 7.1 为所有用户安装（可选）

如果想为系统中的所有用户安装桌面快捷方式：

```bash
sudo nano /usr/share/applications/idea.desktop
```

（使用同样的配置内容）

### 7.2 创建命令行别名

在 `~/.bashrc` 中添加：

```bash
alias idea='idea'
```

然后 `source ~/.bashrc`，之后只需输入 `idea` 即可启动。

> 小技巧：如果你经常需要看日志，也可以创建两个别名：
> ```bash
> alias idea='idea'        # 静默启动
> alias idea-debug='idea.sh'  # 调试模式
> ```

---

## 📌 总结

通过本文的步骤，你完成了：

1. ✅ IntelliJ IDEA 的下载和解压
2. ✅ 安装到 `/opt` 系统目录
3. ✅ 环境变量配置
4. ✅ 桌面快捷方式创建（使用 `idea` 二进制启动器）
5. ✅ 理解 `idea` 和 `idea.sh` 的区别
6. ✅ 文件关联支持

现在你的 Ubuntu 系统已经配置好了专业的 Java 开发环境，可以开始愉快的编码了！
