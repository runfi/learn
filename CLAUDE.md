# CLAUDE.md

本仓库是个人学习讲义站点，通过 GitHub Pages 发布：`.github/workflows/pages.yml` 会在每次推送后自动把整个仓库部署到 https://runfi.github.io/learn/ 。

## 上传新章节讲义的固定流程

用户上传新讲义文件（如 `investments-ch05.html`）后，必须一并完成以下步骤再推送：

1. 放入 `investments/` 文件夹，去掉上传时的随机哈希前缀，恢复原始文件名 `investments-chXX.html`（学习地图的「打开讲义」链接依赖原名）。
2. 同步更新 `investments/investments-index.html`：
   - 找到对应章节行（`id="row-chXX"`），把 `<span class="act todo">讲义待制作</span>` 替换为 `<a class="act" href="investments-chXX.html">打开讲义</a>`；
   - 把进度说明文字「讲义已上线 N 章」的 N 加 1。
3. 在 `investments/README.md` 的文件清单中追加该章。
4. 提交并推送到当前开发分支，GitHub Pages 自动重新部署，无需手动操作。

注意：标注「并入他章」或「选学」的章节行没有「讲义待制作」标记，不适用上述替换。
