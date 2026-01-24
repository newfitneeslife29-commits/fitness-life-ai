import React from 'react';
import { useUser } from '../context/UserContext';

const AboutUs: React.FC = () => {
    const { theme } = useUser();

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 pb-20 animate-in fade-in duration-500">
            {/* Header Section */}
            <header className="text-center md:text-left space-y-2">
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    About <span className="text-primary">Us</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl">
                    Revolutionizing physical and mental well-being through technology and passion.
                </p>
            </header>

            {/* Main Intro Card */}
            <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5 shadow-xl shadow-primary/5">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="p-8 md:p-12 flex flex-col justify-center gap-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase w-fit">
                            <span className="material-symbols-outlined text-sm">fitness_center</span>
                            Our Essence
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                            A comprehensive app for your transformation.
                        </h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Our company is dedicated to providing a comprehensive application for users who attend the gym or are just starting out, offering a full range of services designed to improve health and well-being.
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            The application includes detailed guides for performing exercises effectively, personalized diet plans, smart AI coaching specialized for lifestyle improvement, workout routines adapted to individual goals, and a feature for detailed tracking of personal progress.
                        </p>
                    </div>
                    <div className="relative h-64 lg:h-auto">
                        <img 
                            src="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=1469&auto=format&fit=crop" 
                            alt="Team working out" 
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-black/60 to-transparent"></div>
                    </div>
                </div>
            </section>

            {/* Mission & Vision Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mission */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-surface-raised-dark dark:to-surface-dark rounded-3xl p-8 text-white relative overflow-hidden group hover:scale-[1.01] transition-transform">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-colors"></div>
                    
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="size-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md mb-2">
                            <span className="material-symbols-outlined text-2xl text-primary">flag</span>
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-wide">Our Mission</h3>
                        <p className="text-slate-300 leading-relaxed">
                            To facilitate and empower positive transformation in the lives of our users, offering a comprehensive and personalized experience on their journey toward a healthy and active life. We are committed to providing innovative tools, expert guides, and constant support so that each individual achieves their physical and mental well-being goals.
                        </p>
                    </div>
                </div>

                {/* Vision */}
                <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 border border-slate-100 dark:border-white/5 relative overflow-hidden group hover:border-primary/30 transition-colors">
                     <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-2xl text-primary">visibility</span>
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white">Our Vision</h3>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            To be the leading platform nationally and globally in the health and fitness sector, recognized for our positive impact on people's quality of life. We aspire to be the preferred choice for those seeking a holistic approach to their well-being, utilizing cutting-edge technology with the best artificial intelligence of recent times.
                        </p>
                    </div>
                </div>
            </div>

            {/* Contact Section */}
            <section className="bg-primary/10 dark:bg-white/5 rounded-3xl p-8 text-center border border-primary/20 border-dashed">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Have questions or suggestions?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">We are here to help you every step of the way.</p>
                
                <a href="mailto:newfitneeslife29@gmail.com" className="inline-flex items-center gap-3 bg-white dark:bg-surface-dark px-6 py-4 rounded-2xl shadow-lg hover:scale-105 transition-transform group">
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-xl">mail</span>
                    </div>
                    <div className="text-left">
                        <span className="block text-xs font-bold text-slate-400 uppercase">Contact Us</span>
                        <span className="block text-lg font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">newfitneeslife29@gmail.com</span>
                    </div>
                </a>
            </section>
        </div>
    );
};

export default AboutUs;