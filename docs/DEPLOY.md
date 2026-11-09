# Deploying Billboard

Billboard runs on boris as the systemd user unit `billboard` (`deploy/billboard.service`), from the main checkout at
`/home/ben/projects/billboard`, on port 4710 on all interfaces. Only the tailnet reaches boris, so the page is at
http://boris.tail040b57.ts.net:4710. Nothing runs on AWS and no ports are opened anywhere else.

## Reaching it from the tailnet
tailscaled on boris runs in userspace mode under Agent OS's TCP connect guard (agent-os ADR 0008, `docs/boris.md`), which
lets the tailnet reach only the ports `tailscale serve` forwards. Billboard's is forwarded (`tailscale serve --bg --http 4710
http://127.0.0.1:4710`, 2026-11-08) and `agent-os install --tailnet` rebuilt the guard's list from serve status, so
http://boris.tail040b57.ts.net:4710 answers from any device on the tailnet. agent-os `tailnet/test-tailnet.mjs` checks it.

## How a merge reaches boris
`.github/workflows/deploy.yml` runs on every push to master on a **self-hosted runner on boris**. It runs
`git pull --ff-only` in the main checkout, links and restarts the unit, and checks `/api/health`.

## The runner
A self-hosted runner named `boris` (labels `self-hosted`, `boris`) is registered on the repo and runs as the system service
`actions.runner.bensoutendijk-billboard.boris` from `~/actions-runner/billboard`, as user ben (Ben registered it on
2026-11-08; `sudo ./svc.sh status` there). It must run as ben so `systemctl --user` reaches ben's units; linger is on for ben.
If it stops picking up jobs: `gh api repos/bensoutendijk/billboard/actions/runners` shows whether it is online, and
`sudo ./svc.sh start` in that folder starts it. Registering it again needs a registration token (`gh api -X POST
repos/bensoutendijk/billboard/actions/runners/registration-token`) and `./config.sh`; auto mode won't let an agent do that
step, so it is Ben's.

## Deploying by hand (to fix forward when the runner is down)
```
git -C /home/ben/projects/billboard pull --ff-only
systemctl --user link /home/ben/projects/billboard/deploy/billboard.service   # first time only
systemctl --user daemon-reload && systemctl --user enable --now billboard && systemctl --user restart billboard
curl -s localhost:4710/api/health
journalctl --user -u billboard -n 50   # its logs
```
