import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/GlassCard';
import { getUserProfile, addGeneralNote, deleteGeneralNote, addConceptNote } from '@/lib/store';
import { CONCEPTS } from '@/lib/questions';
import { motion, AnimatePresence } from 'framer-motion';
import { NotebookPen, Plus, Trash2, Tag, Clock, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Notes() {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'concept'>('general');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [selectedConcept, setSelectedConcept] = useState<string>(CONCEPTS[0]);
  const [conceptNoteText, setConceptNoteText] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const profile = user ? getUserProfile(user) : null;
  if (!profile || !user) return null;

  const handleAddGeneral = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please fill in title and content');
      return;
    }
    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    addGeneralNote(user, newTitle.trim(), newContent.trim(), tags);
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setShowAddForm(false);
    refreshProfile();
    toast.success('Note saved');
  };

  const handleAddConcept = () => {
    if (!conceptNoteText.trim()) {
      toast.error('Please enter note content');
      return;
    }
    addConceptNote(user, selectedConcept, conceptNoteText.trim());
    setConceptNoteText('');
    refreshProfile();
    toast.success('Concept note saved');
  };

  const handleDelete = (index: number) => {
    deleteGeneralNote(user, index);
    refreshProfile();
    toast.success('Note deleted');
  };

  const generalNotes = profile.notes.generalNotes;
  const conceptNotes = profile.notes.conceptNotes;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <NotebookPen size={22} className="text-violet-500" />
            Study Notes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Record your insights and concept notes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/40 rounded-xl w-fit">
        {[
          { key: 'general' as const, label: 'General Notes', icon: BookOpen },
          { key: 'concept' as const, label: 'Concept Notes', icon: Tag },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Notes */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-blue px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <Plus size={14} />
            New Note
          </motion.button>

          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <GlassCard hover={false} className="p-5 space-y-3">
                  <input
                    type="text"
                    placeholder="Note title"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/70 border border-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <textarea
                    placeholder="Note content..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/70 border border-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                  <input
                    type="text"
                    placeholder="Tags (comma separated)"
                    value={newTags}
                    onChange={e => setNewTags(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/70 border border-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddGeneral} className="btn-blue px-4 py-2 text-xs">Save</button>
                    <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:bg-white/60">Cancel</button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {generalNotes.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <NotebookPen size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notes yet, click the button above to create one</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {[...generalNotes].reverse().map((note, i) => {
                const realIndex = generalNotes.length - 1 - i;
                const isExpanded = expandedIndex === realIndex;
                return (
                  <GlassCard key={i} hover={false} className="p-0 overflow-hidden">
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : realIndex)}
                      className="w-full text-left p-4 flex items-start justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={10} className="text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {note.tags.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500">{t}</span>
                          ))}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-white/60 pt-3">
                            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
                            <button
                              onClick={() => handleDelete(realIndex)}
                              className="mt-3 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Concept Notes */}
      {activeTab === 'concept' && (
        <div className="space-y-4">
          <GlassCard hover={false} className="p-5 space-y-3">
            <select
              value={selectedConcept}
              onChange={e => setSelectedConcept(e.target.value)}
              className="text-sm bg-white/70 border border-white/80 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full max-w-xs"
            >
              {CONCEPTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea
              placeholder={`Notes about ${selectedConcept}...`}
              value={conceptNoteText}
              onChange={e => setConceptNoteText(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-white/70 border border-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
            <button onClick={handleAddConcept} className="btn-blue px-4 py-2 text-xs">Save Note</button>
          </GlassCard>

          {CONCEPTS.map(concept => {
            const notes = conceptNotes[concept];
            if (!notes || notes.length === 0) return null;
            return (
              <GlassCard key={concept} hover={false}>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tag size={14} className="text-blue-500" />
                  {concept}
                  <span className="text-[10px] text-muted-foreground font-normal">({notes.length} notes)</span>
                </h3>
                <div className="space-y-2">
                  {notes.map((note, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/50 text-xs text-foreground">
                      <p className="whitespace-pre-wrap">{note.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
