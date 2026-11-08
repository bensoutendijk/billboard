# Deploying Billboard

Billboard runs on boris as the systemd user unit `billboard` (`deploy/billboard.service`), from the main checkout at
`/home/ben/projects/billboard`, on port 4710 on all interfaces. Only the tailnet reaches boris, so the page is at
http://boris.tail040b57.ts.net:4710. Nothing runs on AWS and no ports are opened anywhere else.

## How a merge reaches boris
`.github/workflows/deploy.yml` runs on every push to master on a **self-hosted runner on boris**. It runs
`git pull --ff-only` in the main checkout, links and restarts the unit, and checks `/api/health`.

## One-time: register the runner (Ben)
No runner was registered when this was set up (`gh api repos/bensoutendijk/billboard/actions/runners` showed none),
so deploys queue until one is. Until then, a session deploys by hand (below). The token step is Ben's:

1. On GitHub: bensoutendijk/billboard → Settings → Actions → Runners → New self-hosted runner → Linux x64. Copy the
   `--token` value from the `config.sh` line (it lasts an hour).
2. On boris, as ben:
   ```
   mkdir -p ~/actions-runner/billboard && cd ~/actions-runner/billboard
   # download and unpack the runner tarball with the exact curl and tar lines that page shows
   ./config.sh --unattended --url https://github.com/bensoutendijk/billboard --token <the token> --name boris --labels self-hosted,boris
   sudo ./svc.sh install ben && sudo ./svc.sh start
   ```
   The runner must run as `ben`, so `systemctl --user` reaches ben's user units (the workflow sets `XDG_RUNTIME_DIR`).
   Linger is already on for ben, so the units run without a login.
3. Re-run the latest Deploy run, or push to master, and check it goes green.

## Deploying by hand (until the runner exists, or to fix forward)
```
git -C /home/ben/projects/billboard pull --ff-only
systemctl --user link /home/ben/projects/billboard/deploy/billboard.service   # first time only
systemctl --user daemon-reload && systemctl --user enable --now billboard && systemctl --user restart billboard
curl -s localhost:4710/api/health
journalctl --user -u billboard -n 50   # its logs
```
