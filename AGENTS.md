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
- Build the deformation deformation as a standalone GPU point-field module with uniforms and explicit disposal, so the scene can control it without CPU vertex updates.
- Apply optional radial compression only when embedding the deformation field in the globe, preserving the standalone planar domain.

- Keep physical scale radii and logarithmic interpolation in src/layers/powersOfTen.ts; use camera-relative normalized render rebasing in the sandbox to avoid float32 underflow/overflow across the physical ladder.
- Keep the scientific point geometry builders separate from the camera controller, and render stage navigation through the React Button system with a 10 Hz snapshot; this preserves UI ownership and avoids per-frame DOM mutations.
- Add Three.js logarithmic-depth chunks to every custom shader when logarithmicDepthBuffer is enabled; renderer flags alone do not update ShaderMaterial source.
