import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import AboutUs from './AboutUs';

const Landing: React.FC = () => {
    const { language } = useUser();

    const t = {
        EN: {
            badge: "Next Gen Fitness",
            title: "Fitness Life",
            subtitle: "Transform your body with AI-powered personalized workouts, nutrition plans, and progress tracking.",
            getStarted: "Get Started",
            haveAccount: "I have an account",
            smartWorkouts: "Smart Workouts",
            smartWorkoutsDesc: "AI adapts your routine based on your progress and goals.",
            nutritionTracking: "Nutrition Tracking",
            nutritionTrackingDesc: "Log meals and get insights to fuel your body right.",
            realProgress: "Real Progress",
            realProgressDesc: "Visualize your gains with detailed analytics and charts.",
            aboutUs: "About Us",
            aboutUsDesc: "Revolutionizing physical and mental well-being through technology and passion.",
            ourEssence: "Our Essence",
            essenceTitle: "A comprehensive app for your transformation.",
            essenceText1: "Our company is dedicated to providing a comprehensive application for users who attend the gym or are just starting out, offering a full range of services designed to improve health and well-being.",
            essenceText2: "The application includes detailed guides for performing exercises effectively, personalized diet plans, smart AI coaching specialized for lifestyle improvement.",
            ourMission: "Our Mission",
            missionText: "To facilitate and empower positive transformation in the lives of our users, offering a comprehensive and personalized experience on their journey toward a healthy and active life.",
            ourVision: "Our Vision",
            visionText: "To be the leading platform nationally and globally in the health and fitness sector, recognized for our positive impact on people's quality of life.",
            contactTitle: "Have questions or suggestions?",
            contactDesc: "We are here to help you every step of the way.",
            contactBtn: "Contact Us"
        },
        ES: {
            badge: "Fitness de Nueva Generación",
            title: "Fitness Life",
            subtitle: "Transforma tu cuerpo con entrenamientos personalizados por IA, planes de nutrición y seguimiento de progreso.",
            getStarted: "Empezar",
            haveAccount: "Ya tengo cuenta",
            smartWorkouts: "Entrenamientos Inteligentes",
            smartWorkoutsDesc: "La IA adapta tu rutina basándose en tu progreso y metas.",
            nutritionTracking: "Seguimiento Nutricional",
            nutritionTrackingDesc: "Registra comidas y obtén información para alimentar tu cuerpo.",
            realProgress: "Progreso Real",
            realProgressDesc: "Visualiza tus ganancias con análisis y gráficos detallados.",
            aboutUs: "Sobre Nosotros",
            aboutUsDesc: "Revolucionando el bienestar físico y mental a través de la tecnología y la pasión.",
            ourEssence: "Nuestra Esencia",
            essenceTitle: "Una aplicación integral para tu transformación.",
            essenceText1: "Nuestra empresa se dedica a proporcionar una aplicación integral para usuarios que asisten al gimnasio o recién comienzan, ofreciendo una gama completa de servicios para mejorar la salud.",
            essenceText2: "La aplicación incluye guías detalladas de ejercicios, planes de dieta personalizados y coaching por IA especializado para mejorar el estilo de vida.",
            ourMission: "Nuestra Misión",
            missionText: "Facilitar y potenciar la transformación positiva en la vida de nuestros usuarios, ofreciendo una experiencia integral y personalizada hacia una vida saludable y activa.",
            ourVision: "Nuestra Visión",
            visionText: "Ser la plataforma líder nacional y mundial en el sector de salud y fitness, reconocida por nuestro impacto positivo en la calidad de vida de las personas.",
            contactTitle: "¿Tienes preguntas o sugerencias?",
            contactDesc: "Estamos aquí para ayudarte en cada paso del camino.",
            contactBtn: "Contáctanos"
        }
    };

    const text = language === 'ES' ? t.ES : t.EN;

    return (
        <div className="h-screen overflow-y-auto overflow-x-hidden bg-slate-900">
            {/* Hero Section */}
            <div className="relative flex items-center justify-center min-h-screen">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop"
                        alt="Hero Background"
                        className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                </div>

                <div className="relative z-10 container mx-auto px-6 text-center">
                    <div className="mb-8 inline-flex items-center justify-center p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 animate-fade-in-down">
                        <span className="text-primary font-bold tracking-wider uppercase text-sm">{text.badge}</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight animate-fade-in-up">
                        {text.title} <span className="text-primary">AI</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-100">
                        {text.subtitle}
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
                        <Link
                            to="/register"
                            className="w-full md:w-auto px-8 py-4 bg-primary hover:bg-primary-dark text-black font-bold text-lg rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-primary/25"
                        >
                            {text.getStarted}
                        </Link>
                        <Link
                            to="/login"
                            className="w-full md:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md font-bold text-lg rounded-xl transition-all border border-white/10"
                        >
                            {text.haveAccount}
                        </Link>
                    </div>

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto animate-fade-in-up delay-300">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <span className="material-symbols-outlined text-4xl text-primary mb-4">fitness_center</span>
                            <h3 className="text-xl font-bold text-white mb-2">{text.smartWorkouts}</h3>
                            <p className="text-slate-400">{text.smartWorkoutsDesc}</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <span className="material-symbols-outlined text-4xl text-primary mb-4">restaurant</span>
                            <h3 className="text-xl font-bold text-white mb-2">{text.nutritionTracking}</h3>
                            <p className="text-slate-400">{text.nutritionTrackingDesc}</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <span className="material-symbols-outlined text-4xl text-primary mb-4">trending_up</span>
                            <h3 className="text-xl font-bold text-white mb-2">{text.realProgress}</h3>
                            <p className="text-slate-400">{text.realProgressDesc}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* About Us Content Section */}
            <div className="relative bg-slate-900 text-white py-20 px-4 md:px-8">
                <div className="max-w-7xl mx-auto flex flex-col gap-16">

                    {/* Header */}
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black">{text.aboutUs}</h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">{text.aboutUsDesc}</p>
                    </div>

                    {/* Essence Card */}
                    <section className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 shadow-xl">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="p-8 md:p-12 flex flex-col justify-center gap-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase w-fit">
                                    <span className="material-symbols-outlined text-sm">fitness_center</span>
                                    {text.ourEssence}
                                </div>
                                <h3 className="text-2xl font-bold leading-tight">{text.essenceTitle}</h3>
                                <p className="text-slate-300 leading-relaxed">{text.essenceText1}</p>
                                <p className="text-slate-300 leading-relaxed">{text.essenceText2}</p>
                            </div>
                            <div className="relative h-64 lg:h-auto">
                                <img
                                    src="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=1469&auto=format&fit=crop"
                                    alt="Team working out"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-slate-900 to-transparent"></div>
                            </div>
                        </div>
                    </section>

                    {/* Mission & Vision */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Mission */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-white/5 relative overflow-hidden group hover:scale-[1.01] transition-transform">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 blur-[50px] rounded-full group-hover:bg-primary/30 transition-colors"></div>
                            <div className="relative z-10 flex flex-col gap-4">
                                <div className="size-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md mb-2">
                                    <span className="material-symbols-outlined text-2xl text-primary">flag</span>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-wide">{text.ourMission}</h3>
                                <p className="text-slate-300 leading-relaxed">{text.missionText}</p>
                            </div>
                        </div>
                        {/* Vision */}
                        <div className="bg-white/5 rounded-3xl p-8 border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-colors">
                            <div className="relative z-10 flex flex-col gap-4">
                                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                                    <span className="material-symbols-outlined text-2xl text-primary">visibility</span>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-wide">{text.ourVision}</h3>
                                <p className="text-slate-300 leading-relaxed">{text.visionText}</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <section className="bg-primary/5 rounded-3xl p-8 text-center border border-primary/20 border-dashed">
                        <h3 className="text-xl font-bold text-white mb-2">{text.contactTitle}</h3>
                        <p className="text-slate-400 mb-6">{text.contactDesc}</p>

                        <a href="mailto:newfitneeslife29@gmail.com" className="inline-flex items-center gap-3 bg-white/5 px-6 py-4 rounded-2xl shadow-lg hover:bg-white/10 transition-colors group">
                            <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-xl">mail</span>
                            </div>
                            <div className="text-left">
                                <span className="block text-xs font-bold text-slate-400 uppercase">{text.contactBtn}</span>
                                <span className="block text-lg font-black text-white group-hover:text-primary transition-colors">newfitneeslife29@gmail.com</span>
                            </div>
                        </a>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Landing;
