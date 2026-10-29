import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { t } from '../../i18n';
import type { DirectoryEntry, Group } from '../../types/api';

/** "Create a group": a name and the friends in it. The person creating it is always a member. */
export function CreateGroup({ people, onCreated }: { people: DirectoryEntry[]; onCreated: (group: Group) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [state, setState] = useState<{ busy: boolean; error: string }>({ busy: false, error: '' });
  const close = () => { setOpen(false); setName(''); setChosen([]); setState({ busy: false, error: '' }); };
  const toggle = (id: string) => setChosen(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state.busy) return;
    if (!name.trim()) { setState({ busy: false, error: t('Give the group a name.') }); return; }
    if (!chosen.length) { setState({ busy: false, error: t('Choose at least one friend for the group.') }); return; }
    setState({ busy: true, error: '' });
    try {
      const group = await api<Group>('/api/groups', { method: 'POST', body: { name: name.trim(), members: chosen } });
      close();
      onCreated(group);
    } catch (e) { setState({ busy: false, error: errorMessage(e) }); }
  };

  if (!open) return <button type="button" className="create-group-button" onClick={() => setOpen(true)}><Plus size={15} /> {t('Create a group')}</button>;
  return <form className="info-panel create-group" onSubmit={submit} noValidate aria-label={t('Create a group')}>
    <h3>{t('Create a group')}</h3>
    <label className="field-label">{t('Group name')}<input aria-label={t('Group name')} value={name} maxLength={30} placeholder={t('For example: Weekend crew')} onChange={e => { setName(e.target.value); setState(s => ({ ...s, error: '' })); }} /></label>
    <fieldset className="people-picker"><legend>{t('Who is in it?')}</legend>
      {people.map(person => <label key={person.id} className="person-check"><input type="checkbox" checked={chosen.includes(person.id)} onChange={() => { toggle(person.id); setState(s => ({ ...s, error: '' })); }} /><bdi>{person.name}</bdi></label>)}
    </fieldset>
    <p className="fine-print">{t('You are in the group automatically.')}</p>
    {state.error && <p className="error-text" role="alert">{state.error}</p>}
    <div className="button-pair"><button type="submit" className="primary-button" disabled={state.busy}>{state.busy ? t('Creating…') : t('Create the group')}</button><button type="button" className="secondary-button" onClick={close} disabled={state.busy}>{t('Cancel')}</button></div>
  </form>;
}
