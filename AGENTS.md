<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All data comes from the external Spring Boot REST API via src/lib/api.ts (base URL from VITE_API_BASE, default http://localhost:8080/api); no Lovable Cloud — the user owns the backend.
- Session user is kept in sessionStorage key `pup_user` via src/lib/session.tsx; live data polls every 5s with usePolling.
