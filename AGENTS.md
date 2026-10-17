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

- Keep the existing Three.js scene owner for incremental effects; migrating engines would risk its established zoom, audio, and viewport behavior.
- Build the birthday deformation as a standalone GPU point-field module with uniforms and explicit disposal, so the scene can control it without CPU vertex updates.
- Apply optional radial compression only when embedding the birthday field in the globe, preserving the standalone planar domain.
