import React, { useState, useEffect, useRef } from 'react';
import { User, NewsItem } from '../types';
import { subscribeToNews, createNewsItem, updateNewsItem, deleteNewsItem } from '../services/newsService';
import { uploadSupportMedia } from '../services/cloudinaryService';
import { Plus, Image as ImageIcon, CheckCircle, Trash2, Edit2, Loader2, Save, X, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export const NewsManager: React.FC<{ admin: User }> = ({ admin }) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [published, setPublished] = useState(true);

    // Upload state
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsub = subscribeToNews(setNews);
        return unsub;
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setTitle('');
        setContent('');
        setImageUrl('');
        setLinkUrl('');
        setPublished(true);
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEdit = (item: NewsItem) => {
        setEditingId(item.id);
        setTitle(item.title);
        setContent(item.content);
        setImageUrl(item.imageUrl || '');
        setLinkUrl(item.linkUrl || '');
        setPublished(item.published);
        setFile(null);
        setPreview(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this news item?')) {
            try {
                await deleteNewsItem(id);
                toast.success('News item deleted');
            } catch {
                toast.error('Failed to delete news item');
            }
        }
    };

    const handleTogglePublish = async (item: NewsItem) => {
        try {
            await updateNewsItem(item.id, { published: !item.published });
            toast.success(item.published ? 'Unpublished' : 'Published');
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0];
        if (!picked) return;
        if (picked.size > 10 * 1024 * 1024) {
            toast.error('Image must be under 10MB');
            return;
        }
        setFile(picked);
        setPreview(URL.createObjectURL(picked));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        if (!editingId && !file && !imageUrl) {
            toast.error('Please upload an image for the news article');
            return;
        }

        setIsSubmitting(true);
        try {
            let finalImageUrl = imageUrl;
            if (file) {
                toast.loading('Uploading image...', { id: 'upload' });
                const { url } = await uploadSupportMedia(file); // Reusing media uploader (returns { url, publicId, mediaType })
                finalImageUrl = url;
                toast.dismiss('upload');
            }

            if (editingId) {
                await updateNewsItem(editingId, {
                    title: title.trim(),
                    content: content.trim(),
                    imageUrl: finalImageUrl,
                    linkUrl: linkUrl.trim(),
                    published
                });
                toast.success('News updated');
            } else {
                await createNewsItem({
                    title: title.trim(),
                    content: content.trim(),
                    imageUrl: finalImageUrl,
                    linkUrl: linkUrl.trim(),
                    authorId: admin.uid,
                    authorName: admin.displayName || admin.email.split('@')[0],
                    createdAt: Date.now(),
                    published
                });
                toast.success('News created');
            }
            resetForm();
        } catch (err) {
            console.error(err);
            toast.error('Failed to save news article');
            toast.dismiss('upload');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
            {/* Editor Panel */}
            <div className="lg:col-span-1">
                <div className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                    <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
                        {editingId ? <Edit2 size={20} className="text-primary" /> : <Plus size={20} className="text-primary" />}
                        <span className="tracking-wider">{editingId ? 'EDIT ARTICLE' : 'NEW ARTICLE'}</span>
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Headline</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white text-sm focus:border-primary focus:bg-black/60 focus:outline-none transition-all font-mono"
                                placeholder="Breaking eSports News..."
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Content</label>
                            <textarea
                                required
                                rows={6}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white text-sm focus:border-primary focus:bg-black/60 focus:outline-none transition-all font-mono leading-relaxed"
                                placeholder="Write the full article here..."
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                Optional Link <span className="text-[8px] bg-white/10 px-1 py-0.5 rounded text-gray-400">URL</span>
                            </label>
                            <input
                                type="url"
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded p-3 text-white text-sm focus:border-primary focus:bg-black/60 focus:outline-none transition-all font-mono"
                                placeholder="https://example.com/more-info"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Cover Image</label>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col items-center justify-center p-2
                                    ${(preview || imageUrl) ? 'border-primary/50' : 'border-white/10 hover:border-white/30 bg-black/40 h-32'}`}
                            >
                                {preview || imageUrl ? (
                                    <img src={preview || imageUrl} alt="Cover" className="w-full h-40 object-cover rounded-lg" />
                                ) : (
                                    <>
                                        <ImageIcon className="text-gray-400 mb-2" size={24} />
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Click to upload</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                                    ${published ? 'bg-primary border-primary text-white' : 'border-white/20 bg-black/40'}`}>
                                    {published && <CheckCircle size={12} />}
                                </div>
                                <span className="text-xs font-bold text-gray-400 group-hover:text-gray-300 uppercase tracking-widest">Publish Immediately</span>
                                <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="hidden" />
                            </label>
                        </div>

                        <div className="pt-4 flex gap-3">
                            {editingId && (
                                <button type="button" onClick={resetForm} className="px-4 py-3 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:bg-white/5 transition-all">
                                    CANCEL
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {editingId ? 'SAVE CHANGES' : 'PUBLISH NEWS'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* List Panel */}
            <div className="lg:col-span-2">
                <div className="glass-panel rounded-2xl p-6 border border-white/10 h-full">
                    <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
                        <ImageIcon size={20} className="text-primary" />
                        <span className="tracking-wider">PUBLISHED NEWS</span>
                    </h2>

                    <div className="space-y-3">
                        {news.length === 0 ? (
                            <div className="text-center py-12 border border-white/5 border-dashed rounded-xl bg-black/20">
                                <p className="text-sm text-gray-500">No news articles yet.</p>
                            </div>
                        ) : (
                            news.map(item => (
                                <div key={item.id} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-white/5 transition-colors group">
                                    {/* Thumbnail */}
                                    <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-black">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600"><ImageIcon size={16} /></div>
                                        )}
                                    </div>

                                    {/* Content Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button onClick={() => handleEdit(item)} className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors" title="Edit">
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button onClick={() => handleTogglePublish(item)} className={`p-1.5 rounded transition-colors ${item.published ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'}`} title={item.published ? 'Unpublish' : 'Publish'}>
                                                        {item.published ? <Eye size={12} /> : <EyeOff size={12} />}
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors" title="Delete">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{item.content}</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${item.published ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400'}`}>
                                                {item.published ? 'PUBLISHED' : 'DRAFT'}
                                            </span>
                                            {item.linkUrl && (
                                                <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center gap-1">
                                                    LINK <ChevronRight size={10} />
                                                </a>
                                            )}
                                            <span className="text-[9px] text-gray-500">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
