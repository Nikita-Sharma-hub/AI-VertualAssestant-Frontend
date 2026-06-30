import React, { useContext, useState } from "react";
import bg from "../assets/authBg.png";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { userDataContext } from "../context/UserContext";
import axios from "axios";

function SignUp() {
    const [showPassword, setShowPassword] = useState(false);
    const { serverUrl, setUserData } = useContext(userDataContext);
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const handleSignUp = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            const result = await axios.post(
                `${serverUrl}/api/auth/signup`,
                { name, email, password },
                { withCredentials: true }
            );
            setUserData(result.data);
            navigate("/customize");
        } catch (error) {
            setUserData(null);
            setErr(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* 🔥 Remove browser default password eye */}
            <style>
                {`
              input[type="password"]::-ms-reveal,
              input[type="password"]::-ms-clear {
                display: none;
              }

              input[type="password"]::-webkit-credentials-auto-fill-button,
              input[type="password"]::-webkit-textfield-decoration-container {
                display: none !important;
              }
            `}
            </style>

            <div
                className="w-full h-screen bg-cover flex justify-center items-center"
                style={{ backgroundImage: `url(${bg})` }}
            >
                <form
                    onSubmit={handleSignUp}
                    className="w-[90%] max-w-[500px] h-[600px] bg-[#00000062] backdrop-blur shadow-lg shadow-black flex flex-col items-center justify-center gap-[20px] px-[20px]"
                >
                    {/* Heading */}
                    <h1 className="text-[30px] font-semibold mb-[20px] text-white">
                        Register to{" "}
                        <span className="text-blue-400">Virtual Assistant</span>
                    </h1>

                    {/* Name */}
                    <input
                        type="text"
                        placeholder="Your Name"
                        className="w-[90%] h-[60px] border-2 border-white bg-transparent outline-none px-[20px] rounded-full text-[18px] placeholder-gray-300 text-white"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    {/* Email */}
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-[90%] h-[60px] border-2 border-white bg-transparent outline-none px-[20px] rounded-full text-[18px] placeholder-gray-300 text-white"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    {/* Password */}
                    {/* Password Wrapper */}
                    <div className="w-[90%] h-[60px] relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            autoComplete="new-password"
                            data-lpignore="true"
                            className="w-full h-full border-2 border-white bg-transparent outline-none px-[20px] pr-[60px] rounded-full text-[18px] text-white placeholder-gray-300"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />


                        {showPassword ? (
                            <IoEyeOff
                                size={24}
                                className="absolute right-[20px] top-1/2 -translate-y-1/2 cursor-pointer text-white transition-all duration-200 hover:scale-110 hover:text-blue-400"
                                onClick={() => setShowPassword(false)}
                            />
                        ) : (
                            <IoEye
                                size={24}
                                className="absolute right-[20px] top-1/2 -translate-y-1/2 cursor-pointer text-white transition-all duration-200 hover:scale-110 hover:text-blue-400"
                                onClick={() => setShowPassword(true)}
                            />
                        )}
                    </div>

                    {/* Error */}
                    {err && <p className="text-red-500 text-[16px]">* {err}</p>}

                    {/* Button */}
                    <button
                        disabled={loading}
                        className="min-w-[150px] h-[60px] mt-[20px] text-black font-semibold bg-white rounded-full text-[19px] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-white/30 disabled:opacity-70"
                    >
                        {loading ? "Loading..." : "Sign Up"}
                    </button>

                    {/* Redirect */}
                    <p
                        className="text-white text-[18px] cursor-pointer"
                        onClick={() => navigate("/signin")}
                    >
                        Already have an account?{" "}
                        <span className="text-blue-400">Sign In</span>
                    </p>
                </form>
            </div>
        </>
    );
}

export default SignUp;
