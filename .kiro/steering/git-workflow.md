# Git 工作流

- 这个仓库的推送目标是 `initial-structure`,它是 GitHub 上的默认分支。用户说"推默认分支"时,指的就是它,不是 `main`。
- `main` 只通过合并 PR 更新,不要直接往 `main` 推。
- 做完任务后可以直接提交并推送到 `initial-structure`,不用先问用户(用户 2026-11-16 同意)。不要推 `main`,不要强推。
- 提交和推送分两步执行,不要写在同一条命令里。
- 推送前先 `git fetch origin`,看 `HEAD..origin/initial-structure` 有没有新提交。有就先看它们改了哪些文件,没有冲突再 `git rebase origin/initial-structure`,不要强推。
