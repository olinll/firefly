---
title: Halo博客Hao主题添加个人导航页
slug: halo-hao-navigation
published: 2025-11-09 00:00:00
updated: 2025-11-09 00:00:00
description: 详解如何在Halo博客中添加个人导航页，包括添加链接、分组、自定义属性等。
image: api
category: 站点
tags: ["Halo", "主题", "导航页"]
draft: false
# pinned: false
---

> 本教程是修改的主题是[Halo-theme-Hao](https://github.com/chengzhongxue/halo-theme-hao) 版本是：1.6.6
>
> 根据友联页面修改而来。
>
> 原理是添加链接，给分组添加一个自定义属性，通过属性过滤展示的链接

~~效果如图：[前往：导航页](#)~~

![](./images/0002.webp)

下面就开始教程吧！

## 修改Halo运行配置

在运行时会缓存模板文件，下次访问不再会读取物理的模板文件，这会有性能的损耗。

如果我们修改主题，可以添加一个运行参数

[搭建开发环境](https://docs.halo.run/developer-guide/theme/prepare#搭建开发环境)

> [!CAUTION]
> `--spring.thymeleaf.cache=false` 仅用于开发调试，生产环境必须移除此参数，否则会严重影响性能。

```shell
# 关闭主题模板缓存
- --spring.thymeleaf.cache=false
```

## 创建navigation模板页面

首先先找到主题文件夹：在持久化存储的`halo2`文件夹下的`themes/theme-hao`里面

## 修改theme.yaml配置

找到`spec.customTemplates.page`添加一个导航页面模板：

```yaml
spec:
  displayName: Hao
  author:
    name: 程序员小航 & 困困鱼 & Carol
    website: https://github.com/chengzhongxue
  customTemplates:
    page:
      - name: 友情链接页面模版
        description: 支持可预设文本的友链
        screenshot:
        file: page_links.html
      # 添加导航页面模板
      - name: 导航页面模板
        description: 个人导航页
        screenshot:
        file: navigation.html
```

## 添加navigation.html

在`templates`目录下新建一个文件`navigation.html`

添加如下内容：

```html
<!DOCTYPE html>
<html  xmlns:th="http://www.thymeleaf.org"
      th:replace="~{modules/layouts/layout :: layout(content = ~{::content}, htmlType = 'page',title = ${singlePage.spec.title + ' | ' + site.title}, head = ~{::head})}">
<th:block th:fragment="head">
    <th:block th:replace="~{modules/common/open-graph :: open-graph(_title = ${singlePage.spec.title},
                _permalink = ${singlePage.status.permalink},
                _cover = ${singlePage.spec.cover},
                _excerpt = ${singlePage.status.excerpt},
                _type = 'website')}"></th:block>
</th:block>
<th:block th:fragment="content">

    <div class="page" id="body-wrap">
        <header class="not-top-img" id="page-header">
            <nav th:replace="~{modules/nav :: nav(title = ${singlePage.spec.title})}"></nav>
            <link rel="stylesheet" type="text/css" th:href="${assets_link + '/libs/fcircle/heo-fcircle3.css'}">

        </header>
        <main class="layout hide-aside" id="content-inner">
            <div id="page">
                <th:block th:replace="~{macro/content-nav :: content-nav(${htmlType})}" />
                <hr/>
                <!--/* 评论组件 */-->
                <th:block
                        th:replace="~{modules/comment :: comment(group = 'content.halo.run',
                  kind = 'SinglePage',
                  name = ${singlePage.metadata.name},
                  allowComment = ${singlePage.spec.allowComment})}"/>
            </div>
        </main>
        <!-- 底部 -->
        <footer th:replace="~{modules/footer}"/>
    </div>

</th:block>

</html>
```

---

如果想要知道如何修改的，看下面：

将友联对应的html文件复制过来，修改`th:block th:replace`标签里面的`content-links` 改为`content-nav`

```html
<th:block th:replace="~{macro/content-links :: content-links(${htmlType})}" />
改为
 <th:block th:replace="~{macro/content-nav :: content-nav(${htmlType})}" />
```

## 创建conten-nav.html

在主题的`templates/macro`文件夹的下创建`conten-nav.html`文件

```html
<th:block th:fragment="content-nav(htmlType)">

    <th:block th:with="groups = ${linkFinder.groupBy()}">
        <div th:replace="~{macro/author-content :: author-content(background = ${theme.config.moment.backgroundImg},
                        smallTitle = '效率',
                        bigTitle = '个人导航页',
                        detail = '',
                        buttonUrl = '',
                        buttonTitle = '')}"></div>

        <!--互动友链-->

        <div class="flink" id="article-container">

            <th:block th:each="group,iterStat : ${groups}">
                <!-- 只显示 LinkOrFriend 注解等于 "Link" 的分组 -->
                <th:block th:if="${!group.metadata.annotations.containsKey('LinkOrFriend')
                  or #strings.isEmpty(group.metadata.annotations['LinkOrFriend'])
                  or #strings.equals(group.metadata.annotations['LinkOrFriend'], 'Link')}">
                <h2 th:if="${not #lists.isEmpty(group.spec.displayName)}">
                    <a class="headerlink" th:href="'#'+${group.spec.displayName}+'-'+${group.links.size}"
                       th:title="${group.spec.displayName}+ '('+${group.links.size}+')'"></a>
                    [[${group.spec.displayName}]] ([[${group.links.size}]])
                </h2>

                <div class="flink-desc" th:if="${not #strings.isEmpty(#annotations.get(group, 'description'))}">[[${#annotations.get(group, 'description')}]]</div>

                <!-- 第一个，使用卡片展示 -->
                <div th:if="${#strings.equals(#annotations.get(group, 'displayStyle'),'beautify') && not #lists.isEmpty(group.links)}"
                     class="site-card-group">

                    <div class="site-card" th:each="link : ${group.links}">
                        <span th:if="${not #strings.isEmpty(#annotations.get(link, 'label'))}"
                              th:style="'background-color:' + ${#annotations.get(link,'labelColor')}"
                              class="site-card-tag">[[${#annotations.get(link, 'label')}]]</span>

                        <a class="img" target="_blank" th:href="${link.spec.url}" th:title="${link.spec.displayName}">
                            <img class="flink-avatar" style="pointer-events: none;" th:alt="${link.spec.displayName}"
                                 th:with="img = @{${#strings.isEmpty(#annotations.get(link, 'siteshot')) ? link.spec.logo : #annotations.get(link,'siteshot') }}"

                                 th:src="${isLazyload ? loadingImg : img}"
                                 th:data-lazy-src="${ isLazyload ? img : ''}">
                        </a>

                        <a class="info cf-friends-link" target="_blank" th:href="${link.spec.url}"
                           th:title="${link.spec.displayName}">
                            <div class="site-card-avatar no-lightbox">
                                <img class="flink-avatar cf-friends-avatar" th:alt="${link.spec.displayName}"

                                     th:src="${isLazyload ? loadingImg : link.spec.logo}"
                                     th:data-lazy-src="${ isLazyload ? link.spec.logo : ''}">
                            </div>
                            <div class="site-card-text">
                                <span class="title cf-friends-name" th:text="${link.spec.displayName}"></span>
                                <span class="desc" th:text="${link.spec.description}"
                                      th:title="${link.spec.description}"></span>
                            </div>
                        </a>
                    </div>


                </div>

                <div class="flink-list"
                     th:if="${#strings.equals(#annotations.get(group, 'displayStyle'),'default') && not #lists.isEmpty(group.links)}">
                    <div class="flink-list-item" th:each="link : ${group.links}">
                        <span th:if="${not #strings.isEmpty(#annotations.get(link, 'label'))}"
                              th:style="'background-color:' + ${#annotations.get(link,'labelColor')}"
                              class="site-card-tag">[[${#annotations.get(link, 'label')}]]</span>
                        <a class="cf-friends-link" rel="external nofollow" target="_blank" th:href="${link.spec.url}"
                           th:title="${link.spec.displayName}">
                            <img class="flink-avatar cf-friends-avatar" th:alt="${link.spec.displayName}"

                                 th:src="${isLazyload ? loadingImg : link.spec.logo}"
                                 th:data-lazy-src="${ isLazyload ? link.spec.logo : ''}">
                            <div class="flink-item-info no-lightbox">
                                <span class="flink-item-name cf-friends-name" th:text="${link.spec.displayName}"></span>
                                <span class="flink-item-desc" th:text="${link.spec.description}"
                                      th:title="${link.spec.description}"></span>
                                <img
                                     th:src="${isLazyload ? loadingImg : link.spec.logo}"
                                     th:data-lazy-src="${ isLazyload ? link.spec.logo : ''}">
                            </div>
                        </a>
                    </div>
                </div>

                <div class="flink-list mini"
                     th:if="${#strings.equals(#annotations.get(group, 'displayStyle'),'deprecated') && not #lists.isEmpty(group.links)}">
                    <div class="flink-list-item" th:each="link : ${group.links}">
                        <a class="cf-friends-link" rel="external nofollow" target="_blank" th:href="${link.spec.url}"
                           th:title="${link.spec.displayName}">
                            <img class="flink-avatar cf-friends-avatar"

                                 th:src="${isLazyload ? loadingImg : link.spec.logo}"
                                 th:data-lazy-src="${ isLazyload ? link.spec.logo : ''}"
                                 th:alt="${link.spec.displayName}">
                            <div class="img-alt is-center">[[${link.spec.displayName}]]</div>
                            <div class="flink-item-info">
                                <span class="flink-item-name cf-friends-name">[[${link.spec.displayName}]]</span>
                                <span class="flink-item-desc"
                                      th:title="${link.spec.description}">[[${link.spec.description}]]</span>
                            </div>
                        </a>
                    </div>
                </div>
                </th:block>
            </th:block>

            <th:block th:if="${not #strings.isEmpty(theme.config.link.linksArticle)}"
                      th:utext="${theme.config.link.linksArticle}"> </th:block>

            <script>
                var fdataUser = {
                    jsonurl: '',
                    apiurl: "[(${theme.config.fcircle.apiurl})]",
                    apipublicurl: '', //默认公共库
                    initnumber: 20,  //首次加载文章数
                    stepnumber: 20,  //更多加载文章数
                    article_sort: 'created', //文章排序 updated or created
                    error_img: 'https://sdn.geekzu.org/avatar/57d8260dfb55501c37dde588e7c3852c'
                }
            </script>
            <script  th:src="@{/assets/libs/fcircle/heo-fcircle3mini.js}"></script>

            <th:block th:if="${htmlType == 'page'}" th:utext="${singlePage.content.content}">
            </th:block>

        </div>

    </th:block>
</th:block>

```

该组件是从友联页面拷贝而来，上面图片使用的是moments.html里面的。如需修改请自行修改

其中：

```html
<th:block th:if="${!group.metadata.annotations.containsKey('LinkOrFriend')
                  or #strings.isEmpty(group.metadata.annotations['LinkOrFriend'])
                  or #strings.equals(group.metadata.annotations['LinkOrFriend'], 'Link')}">

  <!-- 是只显示 LinkOrFriend 注解等于 "Link" 的分组 -->
```

## 修改links

要让友联页面只显示友联的链接。

## 修改content-links.html

这个页面为展示的链接

找到`macro\content-links.html`，大概28行有一个`<th:block th:each="group : ${groups}">`修改为以下：

```html
<th:block th:each="group : ${groups}"
                              th:if="${group.metadata != null
                                 and group.metadata.annotations != null
                                 and #strings.equals(group.metadata.annotations['LinkOrFriend'], 'Friend')}">
```

## 修改links-canvas.html

这个页面为展示的互动canvas

到最底下修改JavaScript脚本：

```html
 <script th:inline="javascript">
        function refreshFrame() {
            document.getElementById('iframe').contentWindow.location.reload(true);
        }
        const group = [[${ groups }]]

        // 只保留：LinkOrFrend 有值 且 等于 'Frend'
        const filteredGroups = groups.filter(group => {
            const value = group?.metadata?.annotations?.['LinkOrFriend'];
            return value !== undefined && value !== null && value === 'Friend';
        });

        const logos = filteredGroups
            .flatMap(group => group.links || [])
            .map(link => link.spec?.logo)
            .filter(logo => logo && typeof logo === 'string' && logo.trim() !== '');

        localStorage.setItem('logos', JSON.stringify(logos))
    </script>
```

## 创建页面

在后台创建一个页面，自定义模板选择我们刚才创建的`导航页面模板`，进行发布。

## 创建链接

随后在后台的`链接`里面添加分组自定义一个参数`LinkOrFriend=Friend`就在友联里面显示，`LinkOrFriend=Link`或者不填写，就在导航页里面显示

![](./images/0001.webp)

## 编辑建议

> 以下建议基于本条目内容生成，仅供发布前参考。

### 文章内容建议
- 建议补充 Halo 2.x 后台「页面 → 自定义模板」创建导航页的可视化截图（当前文字描述较抽象），帮助读者对照操作
- 建议补充 `customTemplates.page` 字段添加后**必须重启 Halo 才生效**的提示（这是常见踩坑点）
- 建议补充导航页与友联页 `LinkOrFriend` 注解的核心概念说明（一个分组在两个页面之间二选一展示），目前仅在末尾一句带过
- 建议补充对 `displayStyle` 注解（`beautify`/`default`/`deprecated`）三种卡片样式的说明与对比截图

### 修改建议
- 文章标题中「Hao主题」与「Halo博客」中英文混排，建议统一为「Halo 博客 Hao 主题」并在标题中明确主题版本（1.6.6）也是关键信息
- 文中存在多处 `conten-nav.html`（少一个 t），属于 typo，建议在最终发布前纠正
- 第一节「效果如图：[前往：导航页](#)」是占位符（删除线），应清理或替换为真实截图

### 合并建议
- 可与站内「Halo 主题定制」「Halo 自定义页面」类文章合并形成 Halo 主题开发系列
- 当前 slug 与其他 Halo 文章不冲突，暂无需强制合并

### slug 建议
- 当前：`halo-hao-navigation`
- 建议：保留
- 理由：明确包含主题名 + 功能，命名清晰

### 分类建议
- 建议归类到：服务
- 理由：Halo 是「自建应用」，归到「服务」分类下的「自建应用」主题
- 与现状对比：当前 `HomeLab 私有云`，新分类「服务」更精准

### tags 建议
- 建议：`[Halo, 主题, 导航]`
- 与现状对比：当前 `["Halo", "主题", "导航页"]`，差异：`导航页` → `导航`（与同类文章风格一致）

### 其他建议
- 建议补充 Halo 2.10+ 之后 customTemplates 的字段变更说明（项目依赖 Halo 1.6.6 主题，新版本可能已改字段名）
- 模板中大量复用友联页 CSS，主题升级后样式易失效，建议在文末加一句「主题版本升级后需重新适配」
