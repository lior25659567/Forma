import { useRef, useState } from 'react';
import { formatTime } from '../lib/format';
import { deleteProject, listProjects, type ProjectMeta } from '../state/storage';
import { Icon, Logo } from '../ui/Icon';

export function Home({
  onUpload,
  onSample,
  onOpen,
  onAbout,
  busy,
  error,
}: {
  onUpload: (f: File) => void;
  onSample: () => void;
  onOpen: (id: string) => void;
  onAbout: () => void;
  busy: boolean;
  error: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>(() => listProjects());

  return (
    <main className="home">
      <header className="home-top">
        <span className="brand">
          <Logo /> Forma
        </span>
        <button className="link-btn" onClick={onAbout}>
          What works in this build
        </button>
      </header>

      <section className="home-main">
        <h1>Redesign your room with furniture you can buy.</h1>
        <div
          className={`dropzone${drag ? ' is-drag' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) onUpload(f);
          }}
        >
          <Icon name="image" size={28} />
          <p>Drop a photo of your room here</p>
          <div className="dropzone-actions">
            <button className="btn btn-primary" onClick={() => input.current?.click()} disabled={busy}>
              <Icon name="upload" /> {busy ? 'Reading photo…' : 'Upload room photo'}
            </button>
            <button className="btn" onClick={onSample} disabled={busy}>
              Try a sample room
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <ol className="steps">
          <li>
            <b>Add a photo</b>
            <span>One room, taken straight on from a corner or doorway.</span>
          </li>
          <li>
            <b>Pick a style and budget</b>
            <span>Forma proposes a few directions for the same room.</span>
          </li>
          <li>
            <b>Click a piece of furniture</b>
            <span>See options you can afford, preview one in your room, and apply it.</span>
          </li>
        </ol>
      </section>

      {projects.length > 0 && (
        <section className="home-recent" aria-label="Saved projects">
          <h2>Saved projects</h2>
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <button className="recent-open" onClick={() => onOpen(p.id)}>
                  <b>{p.name}</b>
                  <span>
                    {p.rooms} {p.rooms === 1 ? 'room' : 'rooms'} · saved {formatTime(p.updatedAt)}
                  </span>
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => {
                    if (confirm(`Delete “${p.name}”? This can't be undone.`)) {
                      deleteProject(p.id);
                      setProjects(listProjects());
                    }
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
