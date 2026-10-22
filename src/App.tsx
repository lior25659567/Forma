import { useState } from 'react';
import { generateDesign } from './design/generate';
import { uid } from './lib/id';
import { Home } from './screens/Home';
import { Setup, type SetupResult } from './screens/Setup';
import { AboutDialog } from './screens/workspace/Dialogs';
import { Workspace } from './screens/workspace/Workspace';
import { newPhotoRoom, newProject, newSampleRoom, useProject } from './state/project';
import { loadProject, prepareImage, putImage } from './state/storage';
import type { Room } from './types';
import { Dialog } from './ui/Dialog';
import { Icon } from './ui/Icon';

type Pending = { room: Room; mode: 'new' | 'add' };

function finalizeRoom(room: Room, r: SetupResult): Room {
  let next: Room = {
    ...room,
    preferences: r.preferences,
    budget: { ...room.budget, totalIls: r.budgetIls },
    dims: r.dims,
  };
  if (room.source.kind === 'sample') {
    const generated = [0, 1, 2].map((v) => generateDesign(next, r.preferences.style, v));
    next = { ...next, designs: [...next.designs, ...generated], activeDesignId: generated[0].id };
  }
  return next;
}

export function App() {
  const store = useProject();
  const [pending, setPending] = useState<Pending | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [about, setAbout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomCount = store.project?.rooms.length ?? 0;

  const upload = async (file: File, mode: 'new' | 'add') => {
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t an image. Try a JPG or PNG photo of your room.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { blob, width, height } = await prepareImage(file);
      const imageId = uid('img');
      await putImage(imageId, blob);
      setAddOpen(false);
      setPending({ room: newPhotoRoom(imageId, width, height, mode === 'add' ? `Room ${roomCount + 1}` : 'Living room'), mode });
    } catch {
      setError('Couldn’t read that photo. Try a different file.');
    } finally {
      setBusy(false);
    }
  };

  const sample = (mode: 'new' | 'add') => {
    setAddOpen(false);
    setPending({ room: newSampleRoom(), mode });
  };

  const done = (r: SetupResult) => {
    if (!pending) return;
    const room = finalizeRoom(pending.room, r);
    if (pending.mode === 'new') {
      const p = newProject();
      store.open({ ...p, rooms: [room], activeRoomId: room.id });
    } else {
      store.commit(`Added ${room.name}`, (rooms) => [...rooms, room], room.id);
    }
    setPending(null);
  };

  return (
    <>
      {store.project && store.project.rooms.length > 0 ? (
        <Workspace onHome={() => store.close()} onAddRoom={() => setAddOpen(true)} />
      ) : (
        <Home
          busy={busy}
          error={error}
          onUpload={(f) => upload(f, 'new')}
          onSample={() => sample('new')}
          onAbout={() => setAbout(true)}
          onOpen={(id) => {
            const p = loadProject(id);
            if (p) store.open(p);
            else setError('That project couldn’t be opened.');
          }}
        />
      )}

      {pending && <Setup room={pending.room} open onCancel={() => setPending(null)} onDone={done} />}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add a room" size="sm">
        <div className="add-room-opts">
          <label className="btn btn-primary">
            <Icon name="upload" /> {busy ? 'Reading photo…' : 'Upload room photo'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) upload(f, 'add');
              }}
            />
          </label>
          <button className="btn" onClick={() => sample('add')}>
            Add the sample room
          </button>
          {error && <p className="form-error">{error}</p>}
        </div>
      </Dialog>
      <AboutDialog open={about} onClose={() => setAbout(false)} />
    </>
  );
}
