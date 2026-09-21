# dev

Source for https://pineapp.win.

- `public/` is the website. Only this folder is published.
- Everything else (this README, `MEMORY.md`, `.github/`) is never served.

Every push to `main` runs `.github/workflows/deploy.yml`: the server pulls the repo and copies
`public/` into its web root (`/var/www/zunlo-site`, outside the repository). A final step then
checks that private files such as `/.git/HEAD` are not reachable and fails the run if they are.
