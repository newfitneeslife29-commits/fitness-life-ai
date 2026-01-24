import React from 'react';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentUrl: string;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, paymentUrl }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border border-white/10 flex flex-col md:flex-row my-auto">

                {/* Background Image Container */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/gym-premium-bg.png"
                        alt="Gym Background"
                        className="w-full h-full object-cover opacity-40 mix-blend-overlay"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
                </div>

                {/* Content Container */}
                <div className="relative z-10 p-6 md:p-12 flex-1 flex flex-col justify-center">
                    <h2 className="text-2xl md:text-4xl font-black text-white mb-2 leading-tight">
                        Desbloquea tu máximo potencial con <span className="text-primary">Fitness Life Premium</span>
                    </h2>

                    <div className="my-8 space-y-4">
                        {[
                            'Planes de nutrición exactos',
                            'Rutinas de gimnasio avanzadas',
                            'Soporte 24/7'
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="flex items-center justify-center p-1 bg-green-500/20 text-green-400 rounded-full">
                                    <span className="material-symbols-outlined text-lg font-bold">check</span>
                                </span>
                                <span className="text-lg text-slate-200 font-medium">{item}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-end gap-4 mb-8">
                        <span className="text-2xl text-slate-500 line-through decoration-red-500/50 font-bold">$19.99</span>
                        <span className="text-5xl font-black text-white tracking-tight">$7.99</span>
                    </div>

                    <div className="flex flex-col gap-3">
                        <a
                            href={paymentUrl}
                            className="w-full md:w-auto bg-primary text-black text-center font-black text-lg py-4 px-8 rounded-xl shadow-lg shadow-primary/25 hover:bg-primary-dark hover:scale-[1.02] transition-all transform tracking-wide uppercase"
                        >
                            ¡Empezar Ahora!
                        </a>
                        <button
                            onClick={onClose}
                            className="text-slate-400 text-sm hover:text-white transition-colors text-center"
                        >
                            Quizás más tarde
                        </button>
                    </div>
                </div>

                {/* Optional: Right Side Visual for Desktop */}
                <div className="hidden md:block w-1/3 relative z-10 bg-gradient-to-l from-black/20 to-transparent">
                    {/* Could put a badge or abstract shape here if needed */}
                </div>

            </div>
        </div>
    );
};

export default PremiumModal;
