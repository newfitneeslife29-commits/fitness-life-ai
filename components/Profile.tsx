import React from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
    const { user, updateProfile, theme, language } = useUser();
    const navigate = useNavigate();

    const handleDeletePhoto = async (type: 'before' | 'after') => {
        if (!window.confirm("Are you sure you want to delete this photo?")) return;
        if (type === 'before') {
            await updateProfile({ beforePhoto: null });
        } else {
            await updateProfile({ afterPhoto: null });
        }
    };

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 pb-20">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">My Profile</h1>
                <button
                    onClick={() => navigate('/settings')}
                    className="px-6 py-2 rounded-xl font-bold transition-colors bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit Profile
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats & Settings */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm text-center relative">
                        <div className="relative inline-block mb-4">
                            <div className="size-32 rounded-full p-1 bg-gradient-to-br from-primary to-yellow-400 mx-auto">
                                <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-white dark:border-surface-dark" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{user.name}</h2>
                        <p className="text-primary font-bold text-sm uppercase tracking-widest mb-6">{user.experience} • Level {Math.floor((user.xp || 1200) / 1000) + 1}</p>

                        <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-white/5 pt-6">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Weight</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">
                                    {user.weight_unit === 'lbs'
                                        ? Math.round(user.weight * 2.20462)
                                        : user.weight} <span className="text-xs">{user.weight_unit === 'lbs' ? 'lbs' : 'kg'}</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Height</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">
                                    {user.height_unit === 'ft'
                                        ? `${Math.floor((user.height / 2.54) / 12)}'${Math.round((user.height / 2.54) % 12)}`
                                        : user.height} <span className="text-xs">{user.height_unit === 'ft' ? 'ft' : 'cm'}</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Age</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">{user.age}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Summary */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-white">Account Info</h3>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Goal</span>
                            <span className="font-bold text-slate-900 dark:text-white">{user.goal}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Language</span>
                            <span className="font-bold text-slate-900 dark:text-white">{language === 'EN' ? 'English' : language}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Theme</span>
                            <span className="font-bold text-slate-900 dark:text-white capitalize">{theme}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Transformation & Posts */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Transformation */}
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Transformation</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="aspect-[4/5] rounded-2xl bg-slate-200 dark:bg-white/5 relative overflow-hidden group">
                                {user.beforePhoto ? (
                                    <>
                                        <img src={user.beforePhoto} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => handleDeletePhoto('before')}
                                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                            title="Delete Photo"
                                        >
                                            <span className="material-symbols-outlined text-sm block">delete</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">No Photo</div>
                                )}
                                <span className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm pointer-events-none">Before</span>
                            </div>
                            <div className="aspect-[4/5] rounded-2xl bg-slate-200 dark:bg-white/5 relative overflow-hidden group border-2 border-dashed border-slate-300 dark:border-white/10">
                                {user.afterPhoto ? (
                                    <>
                                        <img src={user.afterPhoto} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => handleDeletePhoto('after')}
                                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                            title="Delete Photo"
                                        >
                                            <span className="material-symbols-outlined text-sm block">delete</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">image</span>
                                        <span className="text-sm font-bold">No After Photo</span>
                                    </div>
                                )}
                                <span className="absolute bottom-4 left-4 bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg pointer-events-none">After</span>
                            </div>
                        </div>
                    </div>

                    {/* My Posts */}
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">My Activity</h3>
                        {user.posts.length === 0 ? (
                            <div className="text-center p-8 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">post_add</span>
                                <p className="text-slate-500">No posts yet. Share your journey in Community!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {user.posts.map((post, idx) => (
                                    <div key={idx} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-white/5 flex gap-4">
                                        <div className="size-16 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                                            {post.image && <img src={post.image} className="w-full h-full object-cover" />}
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium line-clamp-2">{post.content}</p>
                                            <span className="text-xs text-slate-400 mt-1 block">Just now</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;