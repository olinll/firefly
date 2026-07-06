---
title: LVM 硬盘工具使用教程
slug: lvm-setup
published: 2025-03-02 00:00:00
updated: 2025-03-02 00:00:00
description: 本文详细的介绍了如何使用LVM进行创建分区,扩容分区等操作
image: api
category: 系统运维
tags: ["LVM", "Disk"]
draft: false
# pinned: false
---

>LVM是Linux系统中用于管理磁盘分区的命令行工具。该工具通过纯软件方式将多个块设备组织为逻辑卷，支持在线调整逻辑卷空间并集成快照功能以实现数据备份。

> [!NOTE]
> 版本差异说明：此操作在 CentOS 7 下进行。CentOS 6 默认文件系统为 ext4（使用 `resize2fs` 命令扩容），CentOS 7 起默认为 xfs（使用 `xfs_growfs` 命令扩容）。写入 fstab 时需注意对应文件系统类型。

>ubuntu也可以使用此文档.

## 一、安装LVM

```shell
# CentOS/RHEL系统
yum  install -y lvm2

# Ubuntu/Debian系统
apt install -y lvm2
```

## 二、命令大全

这里就是常用的创建分区所有使用的命令了，注意部分命令例如`lsblk` 只会提及一次，如想查看完整操作请看下一小节。

```shell
# 查看磁盘分区情况（虚拟磁盘通常是vdx、sata磁盘是sdx、nvme是nvmex）这里使用vdb作为演示
lsblk
# 使用parted工具操作磁盘（格式化磁盘）
parted /dev/vdb
	# 查看磁盘信息
	print
	# 修改为gpt分区表
	mklabel gpt
	# 创建主分区(如果创建一个分区，最后一个为最大容量)
	mkpart primary 0 1045GB
	# 如果有错误就忽略，如果有覆盖选项就Y覆盖
	# 创建完成后可以再次运行print查看磁盘信息

	# 标记1分区为lvm
	set 1 lvm on
	# 退出分区工具
	quit
# 重读分区表 可以再次运行lsblk进行查看分区
partprobe /dev/vdb


# ---------------------------创建分区操作---------------------------

# PV操作
## 创建pv (vdb1就是lsblk的vdb下面的一个分区)
pvcreate -v /dev/vdb1
## 查看pv 这里主要查看创建的pv有没有成功创建，注意这里可能会包含系统的pv
pvdisplay

# VG操作
## 创建vg 这里的vg01就是创建的vg名称
vgcreate -s 4M vg01 /dev/vdb1
## 查看vg 这里同样会包含系统的vg
vgdisplay


# LV操作
## 创建lv 这里的vg01就是vg名称 lv01就是创建的lv名称
lvcreate  -l 100%FREE -n lv01 vg01
## 查看lv 这里同样会包含系统的vg
lvdisplay


# 格式化分区 主要演示格式化为ext4
## 主要语法为 mkfs.ext4 /dev/<vg名称>/<lv名称>
mkfs.ext4 /dev/vg01/lv01

# 进行挂载操作
mkdir /app
mount /dev/vg01/lv01 /app

# 永久写入挂载点
## 查看系统当前挂载信息
blkid
```

> [!CAUTION]
> 写入 `/etc/fstab` 前务必确认 UUID 正确。错误的 UUID 或 fstab 条目会导致系统无法正常启动。建议先用 `mount` 命令测试挂载是否正常，再写入 fstab。

```shell
## 写入fstab文件
echo "UUID=<UUID> /app ext4 defaults 0 0" >> /etc/fstab


# ---------------------------扩容分区操作---------------------------

# VG操作
## 扩展vg，将pv全部扩展到vg下
##vgextend <VG Name> <PV Name>
vgextend vg01 /dev/vdb1
# 查看LV
lvdisplay

# LV操作
## 扩展lv，将vg全部扩展到lv下
lvextend -l +100%FREE <LV Path>
```

> [!WARNING]
> 缩容操作可能导致数据丢失！执行 `lvreduce` 前必须先卸载文件系统并缩小文件系统大小，否则会损坏数据。建议缩容前做好完整备份。

```shell
## 缩小lv分区
lvreduce -L 100G  <LV Path>

# 加载到系统
## 参数为 LV path，**被扩容的挂载点一定是LVM格式
xfs_growfs <LV Path>
```

> [!WARNING]
> 删除分区操作：以下操作包含 `lvremove`、`vgremove`、`rm -rf` 等不可逆命令，执行前请确认数据已备份。删除 LV/VG 后数据将无法恢复。

```shell
# ---------------------------删除分区操作---------------------------

# 删除挂载点
## 如果fstab内有配置需要同步删除
umount -v /dev/vg01/lv01
## 删除目录（可选）
rm -rf /app

# LV操作
## 删除LV
lvremove /dev/vg01/lv01
## 查看LV
lvdisplay

# VG操作
## 删除vg
vgremove vg01
## 查看vg
vgdisplay

```

## 三、扩容分区

在实际环境时，我们会遇到，硬盘临时扩容的情况。

解决方式分为2种。

1. 把临时扩容的部分创建一个分区，合并到 root 的 lv 里面去
2. 扩容当前的 lv

```bash title="方法1"

# 1. 查看当前PV情况
pvdisplay

# 2. 创建新分区（比如 sda3），类型设为 Linux LVM (8e)
fdisk /dev/sda
# 创建新主分区 sda3，使用所有剩余空间
# t 设置类型为 8e
# w 保存

# 3. 刷新分区表
partprobe /dev/sda

# 4. 创建物理卷
pvcreate /dev/sda3

# 5. 扩展到现有卷组
vgextend debian-vg /dev/sda3

# 6. 扩展逻辑卷
lvextend -l +100%FREE /dev/debian-vg/root

# 7. 扩展文件系统
resize2fs /dev/debian-vg/root

```

```bash title="方法2"

# 检查当前分区表：
fdisk /dev/sda
# 按 p 查看分区表。注意 sda5 是从哪个分区扩展的（通常是 sda2的扩展分区）。

# 删除并重建扩展分区（sda2）以包含所有空间：
## 在 fdisk 中，按 d 删除分区，先删 5（扩展分区内的逻辑分区），再删 2（扩展分区本身）。
## 按 n 创建新扩展分区（sda2），选择默认起始扇区，并将结束扇区设置为磁盘末尾（直接按回车使用最大空间）。
## 按 t 将分区类型设置为 5（Extended）。

# 重建逻辑分区 sda5：
## 在 fdisk 中，按 n 创建逻辑分区（sda5），Partition #5 contains a LVM2_member signature. N 使用默认起始扇区，结束扇区同样设置为磁盘末尾。
## 按 t 设置分区类型为 8e（Linux LVM）。

# 保存并退出：
## 按 w 保存更改并退出 fdisk。

# 通知系统分区表变更：
partprobe /dev/sda

# 扩展物理卷（PV）：
pvresize /dev/sda5

# 扩展swap
## 关闭 swap
swapoff -a
## 扩展lv
lvextend -L 4G /dev/debian-vg/swap_1
## 重新创建swap并启用
mkswap /dev/debian-vg/swap_1
swapon /dev/debian-vg/swap_1

#扩展逻辑卷（LV）：
lvextend -l +100%FREE /dev/debian-vg/root

# 调整文件系统大小：如果是 ext4 文件系统：
resize2fs /dev/debian-vg/root

```

## 四、真机实践

### 1. 查看当前磁盘

~~~
[root@fsddxtclgj9vm900419 ~]# df -Th

Filesystem              Type      Size  Used Avail Use% Mounted on
/dev/mapper/centos-root xfs        44G  3.7G   41G   9% /
devtmpfs                devtmpfs  7.8G     0  7.8G   0% /dev
tmpfs                   tmpfs     7.8G     0  7.8G   0% /dev/shm
tmpfs                   tmpfs     7.8G  777M  7.0G  10% /run
tmpfs                   tmpfs     7.8G     0  7.8G   0% /sys/fs/group
/dev/vda1               xfs      1014M  179M  836M  18% /boot
tmpfs                   tmpfs     1.6G   36K  1.6G   1% /run/user/0
tmpfs                   tmpfs     1.6G   40K  1.6G   1% /run/user/1001
~~~

### 2. 查看块分区

~~~
[root@fsddxtclgj9vm900419 ~]# lsblk

NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
vda             252:0    0   50G  0 disk
├─vda1          252:1    0    1G  0 part /boot
└─vda2          252:2    0   49G  0 part
  ├─centos-root 253:0    0   44G  0 lvm  /
  └─centos-swap 253:1    0    5G  0 lvm  [SWAP]
vdb             252:16   0  974G  0 disk
~~~

可以看到 /dev/vdb 为新增的磁盘

### 3. 格式化磁盘

~~~shell
[root@fsddxtclgj9vm900419 ~]# parted /dev/vdb

GNU Parted 3.1
Using /dev/vdb
Welcome to GNU Parted! Type 'help' to view a list of commands.

(parted) print

Error: /dev/vdb: unrecognised disk label
Model: Virtio Block Device (virtblk)
Disk /dev/vdb: 1046GB
Sector size (logical/physical): 512B/512B
Partition Table: unknown
Disk Flags:

(parted) mklabel gpt

(parted) mkpart primary 0 1045GB

Warning: The resulting partition is not properly aligned for best performance.
Ignore/Cancel? i

(parted) print

Model: Virtio Block Device (virtblk)
Disk /dev/vdb: 1046GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags:

Number  Start   End     Size    File system  Name     Flags
 1      17.4kB  1045GB  1045GB               primary

(parted) set 1 lvm on

(parted) print

Model: Virtio Block Device (virtblk)
Disk /dev/vdb: 1046GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags:

Number  Start   End     Size    File system  Name     Flags
 1      17.4kB  1045GB  1045GB               primary  lvm

(parted) quit

Information: You may need to update /etc/fstab

~~~

以上 (parted) 开头的代表输入的命令，具体功能可以通过 help 查看

### 4. 重读分区表

```bash
partprobe /dev/vdb
```

### 5. 重新查看块分区

```dart
[root@fsddxtclgj9vm900419 ~]# lsblk
NAME            MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
vda             252:0    0    50G  0 disk
├─vda1          252:1    0     1G  0 part /boot
└─vda2          252:2    0    49G  0 part
  ├─centos-root 253:0    0    44G  0 lvm  /
  └─centos-swap 253:1    0     5G  0 lvm  [SWAP]
vdb             252:16   0   974G  0 disk
└─vdb1          252:17   0 973.2G  0 part
```

可以看到vdb下多了vdb1，这个用来创建pv

### 6. 创建PV

```csharp
[root@fsddxtclgj9vm900419 ~]# pvcreate -v /dev/vdb1
    Wiping internal VG cache
    Wiping cache of LVM-capable devices
    Wiping signatures on new PV /dev/vdb1.
    Set up physical volume for "/dev/vdb1" with 2041015592 available sectors.
    Zeroing start of device /dev/vdb1.
    Writing physical volume data to disk "/dev/vdb1".
  Physical volume "/dev/vdb1" successfully created.
```

> [!IMPORTANT]
> 扩容前提条件：PV 创建好之后，到这一步可以选择扩展或者新建挂载点。**扩容的前提条件是扩容挂载点的磁盘格式必须是 LVM 格式**，非 LVM 格式的分区无法直接扩容。

这里先演示新建挂载点然后删除挂载点并扩容

### 7. 新增LVM挂载

#### 查看PV

```sql
[root@fsddxtclgj9vm900419 ~]# pvdisplay
  --- Physical volume ---
  PV Name               /dev/vda2
  VG Name               centos
  PV Size               <49.00 GiB / not usable 3.00 MiB
  Allocatable           yes (but full)
  PE Size               4.00 MiB
  Total PE              12543
  Free PE               0
  Allocated PE          12543
  PV UUID               CCUeq0-ZnG9-iUY8-dPOj-fVOa-XC10-ooGyle

  "/dev/vdb1" is a new physical volume of "973.23 GiB"
  --- NEW Physical volume ---
  PV Name               /dev/vdb1
  VG Name
  PV Size               973.23 GiB
  Allocatable           NO
  PE Size               0
  Total PE              0
  Free PE               0
  Allocated PE          0
  PV UUID               vUoC7C-MIP2-iwXr-0SWu-c2Wz-yb6o-qFrfo1
```

注意看 VG Name，前面的是系统安装时选择LVM格式的，后面的还没有创建，所以 VG Name 为空

#### 新建VG

```csharp
[root@fsddxtclgj9vm900419 ~]# vgcreate -s 4M vg01 /dev/vdb1
  Volume group "vg01" successfully created
```

#### 查看VG

```sql
[root@fsddxtclgj9vm900419 ~]# vgdisplay
  --- Volume group ---
  VG Name               vg01
  System ID
  Format                lvm2
  Metadata Areas        1
  Metadata Sequence No  1
  VG Access             read/write
  VG Status             resizable
  MAX LV                0
  Cur LV                0
  Open LV               0
  Max PV                0
  Cur PV                1
  Act PV                1
  VG Size               973.23 GiB
  PE Size               4.00 MiB
  Total PE              249147
  Alloc PE / Size       0 / 0
  Free  PE / Size       249147 / 973.23 GiB
  VG UUID               hb8zoy-kKjU-VXD5-EjCN-8hS2-MOzf-lq3O5j

  --- Volume group ---
  VG Name               centos
  System ID
  Format                lvm2
  Metadata Areas        1
  Metadata Sequence No  3
  VG Access             read/write
  VG Status             resizable
  MAX LV                0
  Cur LV                2
  Open LV               2
  Max PV                0
  Cur PV                1
  Act PV                1
  VG Size               <49.00 GiB
  PE Size               4.00 MiB
  Total PE              12543
  Alloc PE / Size       12543 / <49.00 GiB
  Free  PE / Size       0 / 0
  VG UUID               kSwsMj-4FKB-zwFq-7MBq-EfOD-rccg-HC59x9
```

可以看到 vg01 为新建的VG

#### 新建LV

```csharp
[root@fsddxtclgj9vm900419 ~]# lvcreate  -l 100%FREE -n lv01 vg01
  Logical volume "lv01" created
```

#### 格式化LV

> [!CAUTION]
> 格式化操作会清除分区上的所有数据，请确认分区正确且无重要数据。

格式化文件系统类型有xfs，ext4，这里测试使用ext4格式，**默认centos7下使用xfs格式，centos6为ext4格式**

```mipsasm
[root@fsddxtclgj9vm900419 ~]# mkfs.ext4 /dev/vg01/lv01
mke2fs 1.42.9 (28-Dec-2013)
Filesystem label=
OS type: Linux
Block size=4096 (log=2)
Fragment size=4096 (log=2)
Stride=0 blocks, Stripe width=0 blocks
63782912 inodes, 255126528 blocks
12756326 blocks (5.00%) reserved for the super user
First data block=0
Maximum filesystem blocks=2403336192
7786 block groups
32768 blocks per group, 32768 fragments per group
8192 inodes per group
Superblock backups stored on blocks:
        32768, 98304, 163840, 229376, 294912, 819200, 884736, 1605632, 2654208,
        4096000, 7962624, 11239424, 20480000, 23887872, 71663616, 78675968,
        102400000, 214990848

Allocating group tables: done
Writing inode tables: done
Creating journal (32768 blocks): done
Writing superblocks and filesystem accounting information: done
```

#### 新建挂载点并挂载

```bash
mkdir /app
mount /dev/vg01/lv01 /app
```

#### 查看新增挂载后的块分区

```dart
[root@fsddxtclgj9vm900419 ~]# lsblk
NAME            MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
vda             252:0    0    50G  0 disk
├─vda1          252:1    0     1G  0 part /boot
└─vda2          252:2    0    49G  0 part
  ├─centos-root 253:0    0    44G  0 lvm  /
  └─centos-swap 253:1    0     5G  0 lvm  [SWAP]
vdb             252:16   0   974G  0 disk
└─vdb1          252:17   0 973.2G  0 part
  └─vg01-lv01   253:2    0 973.2G  0 lvm  /app
```

可以看到新增磁盘以LVM格式挂载在 /app 下

#### 永久写入挂载点

~~~shell
blkid

#/dev/mapper/vg01-lv01 on /opt type ext4 (rw,relatime)

# echo "UUID=<UUID> /app ext4 defaults 0 0" >> /etc/fstab
~~~

~~~shell
[root@docker-server ~]# blkid
/dev/sda1: SEC_TYPE="msdos" UUID="F312-EB5D" TYPE="vfat" PARTLABEL="EFI System Partition" PARTUUID="7526c319-8c70-4fa9-ad1a-7a9a906c0f7c"
/dev/sda2: UUID="a169778d-bcee-41d3-899e-aa68e670eb54" TYPE="xfs" PARTUUID="b9de11c9-a9a8-46c7-8484-a3f0450f648f"
/dev/sda3: UUID="4WIoYK-aQng-dGMv-YYjq-RXaj-XKMV-o0RYCL" TYPE="LVM2_member" PARTUUID="b0ebc437-996e-4a3c-b6d3-cf5692413688"
/dev/sdb1: UUID="PHHm7S-6haw-EeGN-2xRl-Cxna-3C9N-4QlPIy" TYPE="LVM2_member" PARTLABEL="primary" PARTUUID="68320f1b-25b0-4070-8a22-79af2af7aa69"
/dev/mapper/centos-root: UUID="375718d4-698b-4709-b721-2c652a87c118" TYPE="xfs"
/dev/mapper/centos-swap: UUID="d7e852bb-0ef8-4545-a3cb-4fb12b8fb9ff" TYPE="swap"
# lvm
/dev/mapper/vg01-lv01: UUID="37bbfff9-76da-4515-a9e5-b8820ea523e5" TYPE="ext4"
/dev/mapper/centos-home: UUID="d3f5743c-588a-4bc1-bb6a-51775db4713e" TYPE="xfs"
[root@docker-server ~]# cat /etc/fstab

#
# /etc/fstab
# Created by anaconda on Wed Jul  3 21:16:34 2024
#
# Accessible filesystems, by reference, are maintained under '/dev/disk'
# See man pages fstab(5), findfs(8), mount(8) and/or blkid(8) for more info
#
/dev/mapper/centos-root /                       xfs     defaults        0 0
UUID=a169778d-bcee-41d3-899e-aa68e670eb54 /boot                   xfs     defaults        0 0
UUID=F312-EB5D          /boot/efi               vfat    umask=0077,shortname=winnt 0 0
/dev/mapper/centos-home /home                   xfs     defaults        0 0
/dev/mapper/centos-swap swap                    swap    defaults        0 0
# 写入
UUID=37bbfff9-76da-4515-a9e5-b8820ea523e5 /app ext4 defaults 0 0

~~~

### 8. 删除LVM挂载点

#### 删除挂载点

```bash
[root@fsddxtclgj9vm900419 ~]# umount -v /dev/vg01/lv01
umount: /app (/dev/mapper/vg01-lv01) unmounted
```

#### 查看块设备

```dart
[root@fsddxtclgj9vm900419 ~]# lsblk
NAME            MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
vda             252:0    0    50G  0 disk
├─vda1          252:1    0     1G  0 part /boot
└─vda2          252:2    0    49G  0 part
  ├─centos-root 253:0    0    44G  0 lvm  /
  └─centos-swap 253:1    0     5G  0 lvm  [SWAP]
vdb             252:16   0   974G  0 disk
└─vdb1          252:17   0 973.2G  0 part
  └─vg01-lv01   253:2    0 973.2G  0 lvm
```

可以看到 /app 挂载点删除了，删除 /app 目录

```bash
rm -rf /app
```

#### 删除LV

参数为 LV Path

```dockerfile
[root@fsddxtclgj9vm900419 ~]# lvremove /dev/vg01/lv01
Do you really want to remove active logical volume vg01/lv01? [y/n]: y
  Logical volume "lv01" successfully removed
```

#### 删除VG

参数为 VG Name

```csharp
[root@fsddxtclgj9vm900419 ~]# vgremove vg01
  Volume group "vg01" successfully removed
```

#### 扩容VG

参数为 VG Name 和 PV Name

```csharp
[root@fsddxtclgj9vm900419 ~]# vgextend centos /dev/vdb1
  Volume group "centos" successfully extended
```

此时 PV /dev/vdb1 全部扩展到 VG centos下

#### 查看LV

```bash
[root@fsddxtclgj9vm900419 ~]# lvdisplay
  --- Logical volume ---
  LV Path                /dev/centos/swap
  LV Name                swap
  VG Name                centos
  LV UUID                PCx0yU-o9JZ-R92O-lI01-f8EU-DKyM-etst0H
  LV Write Access        read/write
  LV Creation host, time localhost.localdomain, 2018-12-24 16:46:31 +0800
  LV Status              available
  # open                 2
  LV Size                5.00 GiB
  Current LE             1280
  Segments               1
  Allocation             inherit
  Read ahead sectors     auto
  - currently set to     8192
  Block device           253:1

  --- Logical volume ---
  LV Path                /dev/centos/root
  LV Name                root
  VG Name                centos
  LV UUID                Idf9IO-AxkA-tS1C-FTgN-FsLT-d3Zk-7o1W5E
  LV Write Access        read/write
  LV Creation host, time localhost.localdomain, 2018-12-24 16:46:31 +0800
  LV Status              available
  # open                 1
  LV Size                <44.00 GiB
  Current LE             11263
  Segments               1
  Allocation             inherit
  Read ahead sectors     auto
  - currently set to     8192
  Block device           253:0
```

通过查看，系统安装时选择的磁盘格式是LVM并且有两个分区，接下来扩展根分区

#### 扩展LV分区

参数为 LV Path

```dockerfile
[root@fsddxtclgj9vm900419 ~]# lvextend -l +100%FREE /dev/centos/root
  Size of logical volume centos/root changed from <44.00 GiB (11263 extents) to <1017.23 GiB (260410 extents).
  Logical volume centos/root successfully resized
```

如果发现误操作，需要还原，可以通过以下命令缩小LV分区

```bash
lvreduce -L 1017.2G  /dev/centos/root
```

#### 加载扩容到系统

此时查看系统可以看到已经扩容，但没有加载到文件系统

```bash
[root@fsddxtclgj9vm900419 ~]# lsblk
NAME            MAJ:MIN RM    SIZE RO TYPE MOUNTPOINT
vda             252:0    0     50G  0 disk
├─vda1          252:1    0      1G  0 part /boot
└─vda2          252:2    0     49G  0 part
  ├─centos-root 253:0    0 1017.2G  0 lvm  /
  └─centos-swap 253:1    0      5G  0 lvm  [SWAP]
vdb             252:16   0    974G  0 disk
└─vdb1          252:17   0  973.2G  0 part
  └─centos-root 253:0    0 1017.2G  0 lvm  /
[root@fsddxtclgj9vm900419 ~]# df -h
Filesystem               Size  Used Avail Use% Mounted on
/dev/mapper/centos-root   44G  3.7G   41G   9% /
devtmpfs                 7.8G     0  7.8G   0% /dev
tmpfs                    7.8G     0  7.8G   0% /dev/shm
tmpfs                    7.8G  777M  7.0G  10% /run
tmpfs                    7.8G     0  7.8G   0% /sys/fs/cgroup
/dev/vda1               1014M  179M  836M  18% /boot
tmpfs                    1.6G   36K  1.6G   1% /run/user/0
tmpfs                    1.6G   40K  1.6G   1% /run/user/1001
```

**加载扩容到系统**

参数为 LV path，**被扩容的挂载点一定是LVM格式**

```haskell
[root@fsddxtclgj9vm900419 ~]# xfs_growfs /dev/centos/root
meta-data=/dev/mapper/centos-root isize=512    agcount=4, agsize=2883328 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=0 spinodes=0
data     =                       bsize=4096   blocks=11533312, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
log      =internal               bsize=4096   blocks=5631, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
data blocks changed from 11533312 to 266659840
```

说明：若使用ext4文件格式（centos6），是使用resize2fs命令来生效

**查看磁盘**

```bash
[root@fsddxtclgj9vm900419 ~]# df -h
Filesystem               Size  Used Avail Use% Mounted on
/dev/mapper/centos-root 1018G  3.7G 1014G   1% /
devtmpfs                 7.8G     0  7.8G   0% /dev
tmpfs                    7.8G     0  7.8G   0% /dev/shm
tmpfs                    7.8G  777M  7.0G  10% /run
tmpfs                    7.8G     0  7.8G   0% /sys/fs/cgroup
/dev/vda1               1014M  179M  836M  18% /boot
tmpfs                    1.6G   36K  1.6G   1% /run/user/0
tmpfs                    1.6G   40K  1.6G   1% /run/user/1001
```

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 建议补充"LVM 快照（snapshot）"小节：LVM 快照是核心卖点之一（用于一致性备份），可写一段 `lvcreate --size 2G --snapshot --name snap01 /dev/vg01/lv01` 的用例，链接到 `xtrabackup-backup`、`postgresql-backup`。
- 建议补一段"Thin Provisioning（精简卷）"：与 thick provisioning 的对比，列 `lvcreate --type thin` 的命令；与"hypervisor/容器"场景契合度高。
- "三、扩容分区 - 方法 2"步骤中"删除并重建扩展分区"是 MBR 分区表专属操作；建议在文首加一句"方法 2 仅适用于 MBR（msdos）分区表，GPT 用户请用方法 1"，避免读者在 GPT 磁盘上误用 fdisk。
- 第二章"命令大全"段落代码块里使用了 `csharp`、`dart`、`mipsasm` 等奇怪的语言标签，应该是终端/Shell 输出，建议全部统一为 `bash` 或 `shell`。
- 建议补"Thin pool 元数据自动扩容"（`lvchange --monitor y`）与"在线扩容 swap"小节，对应 hypervisor/数据库场景高频需求。

### 修改建议
- 整篇文件超过 700 行，但目录里没有清晰的"命令速查 vs 真机实践"分隔；建议在第二章末尾加一行"以下是真机实践，按流程逐步演示"。
- "一、安装 LVM"只列了 `yum install lvm2` 和 `apt install lvm2`，没有验证方法；建议补 `lvm version` 或 `pvdisplay` 验证。
- "二、命令大全"段落使用了 `set 1 lvm on` 但 parted 在 GPT 上的 `lvm` flag 行为在某些版本不一致，建议改为"创建物理卷前可省略 lvm flag，靠 `pvcreate` 完成元数据写入"。
- 多处真机实践的 hostname（`fsddxtclgj9vm900419`）看起来像阿里云内部 ID，建议脱敏为 `~` 或 `localhost`，避免无意中暴露服务器信息。

### 合并建议
- 候选合并对象：`linux-software-raid-mdadm-guide`（同属 Linux 存储/磁盘管理）、`centos-install-config` / `debian-install-config` / `ubuntu-install-config`（安装阶段分区部分可外链本文）
- 合并理由：建议把 `lvm-setup` 和 `linux-software-raid-mdadm-guide` 合并为系列总览 `linux-storage-and-disk-management`，下挂"lvm-setup"和"raid-mdadm-guide"两篇分文档；不要与三篇 OS 安装文档合并（安装阶段分区只是初始化一部分，应作为外链引用）。

### slug 建议
- 当前：`lvm-setup`
- 建议：保留（也可改为 `linux-lvm-guide`）
- 理由：slug 简短且表意明确；如要更精准可改为 `linux-lvm-guide` 与 `linux-software-raid-mdadm-guide` 命名风格统一。

### 分类建议
- 建议归类到：系统
- 理由：内容是 Linux 磁盘管理底层工具（LVM），与新分类"系统"中的"底层工具"对应；不是"虚拟化"（虽然 NAS/PVE 场景常用，但本文不涉及）、不是"服务"（不涉及具体应用的存储配置）。

### tags 建议
- 建议：`[LVM, 磁盘管理, 存储]`
- 与现状对比：`["LVM", "Disk"]`，差异说明：原 tags 中"Disk"过于泛化且是英文，改为"磁盘管理"（中文主题词，更直观）+ "存储"（覆盖 LVM 的应用场景），便于读者按"存储"标签聚合其他相关文章。

### 其他建议
- 第三章扩容流程的命令特别长，建议给一张流程图（"查看 PV → 创建新分区 → pvcreate → vgextend → lvextend → resize2fs/xfs_growfs"），帮助初学者记忆执行顺序。
- 建议加一段"使用 LVM 时怎么选文件系统"：xfs 不支持缩容、ext4 支持；centos7 默认 xfs、centos6 默认 ext4 的差异表，方便读者决策。