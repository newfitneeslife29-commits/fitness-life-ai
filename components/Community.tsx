import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import confetti from 'canvas-confetti';

interface PostProps {
    id: number;
    user: string;
    avatar: string;
    image?: string;
    content: string;
    likes: number;
    comments: number;
    time: string;
    isLiked?: boolean;
}

const SocialPost: React.FC<PostProps> = ({ id, user, avatar, image, content, likes: initialLikes, comments, time, isLiked: initialIsLiked }) => {
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(initialIsLiked || false);
    const [friendStatus, setFriendStatus] = useState<'none' | 'sent' | 'friends'>('none');

    const toggleLike = () => {
        if (isLiked) {
            setLikes(l => l - 1);
            setIsLiked(false);
        } else {
            setLikes(l => l + 1);
            setIsLiked(true);
            confetti({ particleCount: 20, spread: 30, origin: { y: 0.8 }, colors: ['#ea580c'] });
        }
    };

    const handleFriendRequest = () => {
        if (friendStatus === 'none') setFriendStatus('sent');
    };

    return (
        <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 p-4 mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="size-10 rounded-full bg-cover bg-center ring-2 ring-primary/20" style={{backgroundImage: `url(${avatar})`}}></div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{user}</h4>
                        <p className="text-xs text-slate-500">{time}</p>
                    </div>
                </div>
                <button 
                    onClick={handleFriendRequest}
                    disabled={friendStatus !== 'none'}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                        friendStatus === 'friends' ? 'bg-green-100 text-green-600' :
                        friendStatus === 'sent' ? 'bg-slate-100 text-slate-500' :
                        'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                    }`}
                >
                    {friendStatus === 'friends' ? 'Friends' : friendStatus === 'sent' ? 'Request Sent' : '+ Add Friend'}
                </button>
            </div>
            
            <p className="text-slate-700 dark:text-slate-300 text-sm mb-4 leading-relaxed">{content}</p>
            
            {image && (
                <div className="rounded-xl overflow-hidden mb-4 shadow-md">
                    <img src={image} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" />
                </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex gap-4">
                    <button 
                        onClick={toggleLike}
                        className={`flex items-center gap-1 transition-colors group ${isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
                    >
                        <span className={`material-symbols-outlined text-[20px] ${isLiked ? 'filled' : ''}`}>favorite</span>
                        <span className="text-xs font-bold">{likes}</span>
                    </button>
                    <button className="flex items-center gap-1 text-slate-500 hover:text-blue-500 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                        <span className="text-xs font-bold">{comments}</span>
                    </button>
                </div>
                <button className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <span className="material-symbols-outlined text-[20px]">share</span>
                </button>
            </div>
        </div>
    );
};

const Community: React.FC = () => {
    const { user, addPost } = useUser();
    const [requests, setRequests] = useState([{ id: 101, user: 'Mike Ross', avatar: 'https://picsum.photos/100/100?random=50' }]);
    const [storyModal, setStoryModal] = useState<string | null>(null);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [newPostText, setNewPostText] = useState('');
    const [newPostImage, setNewPostImage] = useState<string | null>(null);
    const [stories, setStories] = useState([
        { user: 'Sarah', avatar: 'https://picsum.photos/100/100?random=1', image: 'https://picsum.photos/400/800?random=1' },
        { user: 'David', avatar: 'https://picsum.photos/100/100?random=2', image: 'https://picsum.photos/400/800?random=2' },
        { user: 'Gym Bro', avatar: 'https://picsum.photos/100/100?random=3', image: 'https://picsum.photos/400/800?random=3' }
    ]);
    const [chatOpen, setChatOpen] = useState<string | null>(null);

    const acceptRequest = (id: number) => setRequests(prev => prev.filter(r => r.id !== id));

    const handleCreatePost = () => {
        if(!newPostText) return;
        const post = {
            id: Date.now(),
            user: user.name,
            avatar: user.avatar,
            image: newPostImage || undefined,
            content: newPostText,
            likes: 0,
            comments: 0,
            time: 'Just now',
            isLiked: false
        };
        // In a real app we would push to a global list, here we just show visually in profile or simulate
        addPost(post);
        setIsPostModalOpen(false);
        setNewPostText('');
        setNewPostImage(null);
        confetti();
    };

    const handleStoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file) {
            const r = new FileReader();
            r.onload = () => {
                setStories(prev => [{user: 'You', avatar: user.avatar, image: r.result as string}, ...prev]);
            };
            r.readAsDataURL(file);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 pb-20 relative">
            
            {/* Main Feed */}
            <div className="flex-1 max-w-2xl mx-auto w-full">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">Community Feed</h1>
                    <button onClick={() => setIsPostModalOpen(true)} className="bg-primary hover:bg-primary-dark text-white rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-sm">add_a_photo</span>
                        New Post
                    </button>
                </header>
                
                {/* Stories */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group relative">
                         <div className="size-16 rounded-full p-[3px] border-2 border-slate-200 dark:border-white/10 relative">
                                <div className="w-full h-full rounded-full bg-cover bg-center" style={{backgroundImage: `url(${user.avatar})`}}></div>
                                <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5 border-2 border-white dark:border-surface-dark">
                                    <span className="material-symbols-outlined text-xs font-bold block">add</span>
                                </div>
                                <input type="file" accept="image/*" onChange={handleStoryUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                         <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Your Story</span>
                    </div>

                    {stories.map((story, i) => (
                        <div key={i} onClick={() => setStoryModal(story.image)} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
                            <div className="size-16 rounded-full p-[3px] bg-gradient-to-tr from-primary to-yellow-400">
                                <div className="w-full h-full rounded-full bg-white dark:bg-surface-dark border-2 border-white dark:border-surface-dark bg-cover bg-center" style={{backgroundImage: `url(${story.avatar})`}}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{story.user}</span>
                        </div>
                    ))}
                </div>

                {/* Friend Requests */}
                {requests.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Friend Requests</h3>
                        {requests.map(req => (
                            <div key={req.id} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-full bg-cover" style={{backgroundImage: `url(${req.avatar})`}}></div>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{req.user} wants to connect.</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => acceptRequest(req.id)} className="bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-600">Accept</button>
                                    <button onClick={() => acceptRequest(req.id)} className="bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg">Decline</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Feed */}
                <div className="flex flex-col">
                    {/* Render User Posts First if any (In a real app, this would be mixed) */}
                    {user.posts.map((post: any) => (
                        <SocialPost key={post.id} {...post} />
                    ))}
                    <SocialPost 
                        id={1}
                        user="Sarah Connor" 
                        avatar="https://picsum.photos/100/100?random=1"
                        image="https://picsum.photos/600/400?random=1"
                        content="Just crushed a new PR on deadlifts! The AI Coach adjustment to my warm-up routine made all the difference. 🚀 #FitnessLife #Gains"
                        likes={124}
                        comments={18}
                        time="2h ago"
                        isLiked={true}
                    />
                    <SocialPost 
                        id={2}
                        user="David G." 
                        avatar="https://picsum.photos/100/100?random=2"
                        content="Recovery day today. Focus on mobility and hydration. Any good stretching flows you guys recommend?"
                        likes={45}
                        comments={12}
                        time="5h ago"
                        isLiked={false}
                    />
                </div>
            </div>

            {/* Sidebar (Friends & Chat) */}
            <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 p-6 shadow-sm sticky top-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">Active Friends</h3>
                        <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">4 Online</span>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                         {[1, 2, 3, 4].map((i) => (
                             <div key={i} onClick={() => setChatOpen(`User ${i}`)} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-lg -mx-2 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="size-10 rounded-full bg-cover bg-center" style={{backgroundImage: `url(https://picsum.photos/100/100?random=${i+10})`}}></div>
                                        <div className="absolute bottom-0 right-0 size-3 border-2 border-white dark:border-surface-dark bg-green-500 rounded-full"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">User {i}</span>
                                        <span className="text-xs text-slate-500">Training Legs...</span>
                                    </div>
                                </div>
                                <button className="text-slate-400 hover:text-primary">
                                    <span className="material-symbols-outlined text-[20px]">chat</span>
                                </button>
                             </div>
                         ))}
                    </div>
                </div>
            </aside>

            {/* Modals */}
            
            {/* Story Viewer */}
            {storyModal && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setStoryModal(null)}>
                    <img src={storyModal} className="max-h-[80vh] rounded-xl" />
                </div>
            )}

            {/* New Post Modal */}
            {isPostModalOpen && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create New Post</h3>
                        <textarea 
                            value={newPostText}
                            onChange={(e) => setNewPostText(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-white/5 rounded-xl p-4 mb-4 border-none text-slate-900 dark:text-white"
                            placeholder="What's on your mind?"
                            rows={4}
                        ></textarea>
                        {newPostImage && (
                            <img src={newPostImage} className="h-32 rounded-lg object-cover mb-4" />
                        )}
                        <div className="flex justify-between items-center">
                            <label className="cursor-pointer text-primary font-bold text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined">image</span> Add Photo
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if(f) { const r = new FileReader(); r.onload=()=>setNewPostImage(r.result as string); r.readAsDataURL(f); }
                                }}/>
                            </label>
                            <div className="flex gap-2">
                                <button onClick={() => setIsPostModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold">Cancel</button>
                                <button onClick={handleCreatePost} className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Post</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Modal (Simulation) */}
            {chatOpen && (
                <div className="fixed bottom-0 right-4 w-80 bg-white dark:bg-surface-dark rounded-t-2xl shadow-2xl border border-slate-200 dark:border-white/10 z-[50]">
                    <div className="bg-primary p-3 rounded-t-2xl flex justify-between items-center text-white">
                        <span className="font-bold">{chatOpen}</span>
                        <button onClick={() => setChatOpen(null)}><span className="material-symbols-outlined text-sm">close</span></button>
                    </div>
                    <div className="h-64 p-4 overflow-y-auto bg-slate-50 dark:bg-black/20">
                        <div className="mb-2 text-left"><span className="inline-block bg-white dark:bg-surface-raised-dark p-2 rounded-lg rounded-tl-none text-sm shadow-sm">Hey! How was the workout?</span></div>
                        <div className="mb-2 text-right"><span className="inline-block bg-primary text-white p-2 rounded-lg rounded-tr-none text-sm">Intense! Leg day destroyed me.</span></div>
                    </div>
                    <div className="p-2 border-t border-slate-100 dark:border-white/5 flex gap-2">
                        <input className="flex-1 text-sm rounded-lg border-none bg-slate-100 dark:bg-white/5" placeholder="Message..." />
                        <button className="text-primary"><span className="material-symbols-outlined">send</span></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Community;