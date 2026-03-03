import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import API_URL from '../../config';

const Login: React.FC = () => {
    const [loginForm, setLoginForm] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                login: loginForm,
                password
            });
            const { token, user } = response.data;
            login(token, user);
            navigate('/'); // Redirect to Dashboard
        } catch (err: any) {
            setError(err.response?.data?.error || 'Ошибка авторизации. Проверьте сервер.');
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative bg-neutral-900"
            style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1504917595217-d4dc5cb9aef8?q=80&w=1920&auto=format&fit=crop')",
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {/* Dark overlay to ensure text readability */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

            <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-10 rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">ЛИТЭКС</h2>
                    <p className="text-orange-400 font-medium tracking-wide mt-1">Литейное Производство</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-neutral-200 mb-1">Логин</label>
                        <input
                            type="text"
                            value={loginForm}
                            onChange={(e) => setLoginForm(e.target.value)}
                            className="block w-full px-4 py-3 bg-white/90 border border-white/30 rounded-xl text-neutral-900 placeholder-neutral-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            placeholder="Введите логин"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-200 mb-1">Пароль</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full px-4 py-3 bg-white/90 border border-white/30 rounded-xl text-neutral-900 placeholder-neutral-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            placeholder="Введите пароль"
                            required
                        />
                    </div>
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                            <p className="text-red-200 text-sm text-center font-medium">{error}</p>
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full mt-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:from-orange-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-all transform active:scale-[0.98]"
                    >
                        ВОЙТИ В СИСТЕМУ
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
