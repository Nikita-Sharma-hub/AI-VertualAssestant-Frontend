import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif"
function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } = useContext(userDataContext)
  const navigate = useNavigate()
  const [listening, setListening] = useState(false)
  const [userText, setUserText] = useState("")
  const [aiText, setAiText] = useState("")
  const isSpeakingRef = useRef(false)
  const recognitionRef = useRef(null)
  const [ham, setHam] = useState(false)
  const isRecognizingRef = useRef(false)
  const synth = window.speechSynthesis
  const networkErrorCountRef = useRef(0)
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(true)
  const errorOccurredRef = useRef(false)
  const recognitionStartTimeRef = useRef(null)

  const handleLogOut = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true })
      setUserData(null)
      navigate("/signin")
    } catch (error) {
      setUserData(null)
      console.log(error)
    }
  }

  const startRecognition = () => {

    if (!isSpeakingRef.current && !isRecognizingRef.current) {
      try {
        recognitionRef.current?.start();
        console.log("Recognition requested to start");
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          console.error("Start error:", error);
        }
      }
    }

  }

  const speak = (text) => {
    const utterence = new SpeechSynthesisUtterance(text)
    utterence.lang = 'hi-IN';
    const voices = window.speechSynthesis.getVoices()
    const hindiVoice = voices.find(v => v.lang === 'hi-IN');
    if (hindiVoice) {
      utterence.voice = hindiVoice;
    }


    isSpeakingRef.current = true
    utterence.onend = () => {
      setAiText("");
      isSpeakingRef.current = false;
      setTimeout(() => {
        startRecognition(); // ⏳ Delay se race condition avoid hoti hai
      }, 800);
    }
    synth.cancel(); // 🛑 pehle se koi speech ho to band karo
    synth.speak(utterence);
  }

  const handleCommand = (data) => {
    const { type, userInput, response } = data;

    speak(response);

    if (type === 'google-search') {
      const query = encodeURIComponent(userInput);
      window.location.href = `https://www.google.com/search?q=${query}`;
    }

    if (type === 'calculator-open') {
      window.location.href = `https://www.google.com/search?q=calculator`;
    }

    if (type === "instagram-open") {
      window.location.href = `https://www.instagram.com/`;
    }

    if (type === "facebook-open") {
      window.location.href = `https://www.facebook.com/`;
    }

    if (type === "weather-show") {
      window.location.href = `https://www.google.com/search?q=weather`;
    }

    if (type === 'youtube-search' || type === 'youtube-play') {
      const query = encodeURIComponent(userInput);
      window.location.href = `https://www.youtube.com/results?search_query=${query}`;
    }
  };


  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognitionRef.current = recognition;

    let isMounted = true;  // flag to avoid setState on unmounted component

    // Start recognition after 1 second delay only if component still mounted
    const startTimeout = setTimeout(() => {
      if (isMounted && !isSpeakingRef.current && !isRecognizingRef.current) {
        try {
          recognition.start();
          console.log("Recognition requested to start");
        } catch (e) {
          if (e.name !== "InvalidStateError") {
            console.error(e);
          }
        }
      }
    }, 1000);

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
      recognitionStartTimeRef.current = Date.now(); // Track when recognition started
      errorOccurredRef.current = false; // Reset error flag
      setSpeechRecognitionAvailable(true);
      // Don't reset network error counter here - it will reset only after successful operation
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      // Don't restart if an error occurred (onerror will handle retry) or if we've hit network error limit
      if (isMounted && !isSpeakingRef.current && !errorOccurredRef.current && networkErrorCountRef.current < 3) {
        setTimeout(() => {
          if (isMounted && !errorOccurredRef.current && networkErrorCountRef.current < 3) {
            try {
              recognition.start();
              console.log("Recognition restarted");
            } catch (e) {
              if (e.name !== "InvalidStateError") console.error(e);
            }
          }
        }, 1000);
      }
      // Reset error flag after onend completes
      errorOccurredRef.current = false;
    };

    recognition.onerror = (event) => {
      // Don't log "aborted" errors - they're expected when stopping recognition
      if (event.error !== "aborted") {
        console.warn("Recognition error:", event.error);
      }
      isRecognizingRef.current = false;
      setListening(false);
      errorOccurredRef.current = true; // Mark that an error occurred

      // Don't handle "aborted" errors - they're intentional stops
      if (event.error === "aborted") {
        errorOccurredRef.current = false; // Reset flag for aborted
        return;
      }

      // Handle network errors specifically - stop retrying after multiple failures
      if (event.error === "network") {
        // Only increment if recognition didn't just start (avoid counting rapid start->error cycles)
        const timeSinceStart = recognitionStartTimeRef.current ? Date.now() - recognitionStartTimeRef.current : Infinity;
        if (timeSinceStart > 2000) { // Only count if running for more than 2 seconds
          networkErrorCountRef.current += 1;
        } else {
          // If error happened quickly after start, increment anyway but log it
          networkErrorCountRef.current += 1;
        }
        console.log(`Network error count: ${networkErrorCountRef.current}/3`);
        if (networkErrorCountRef.current >= 3) {
          console.error("Speech recognition unavailable: Network error persists. Stopping retries.");
          setSpeechRecognitionAvailable(false);
          errorOccurredRef.current = false; // Reset flag since we're stopping
          return; // Stop retrying
        }
      } else {
        // Reset counter for non-network errors (they're usually recoverable)
        networkErrorCountRef.current = 0;
      }

      // Don't retry for certain fatal errors
      const fatalErrors = ["not-allowed", "service-not-allowed", "no-speech"];
      if (fatalErrors.includes(event.error)) {
        console.error(`Speech recognition unavailable: ${event.error}`);
        setSpeechRecognitionAvailable(false);
        errorOccurredRef.current = false; // Reset flag since we're stopping
        return;
      }

      // Retry for recoverable errors (but not network if we've tried too many times)
      if (isMounted && !isSpeakingRef.current && networkErrorCountRef.current < 3) {
        const delay = event.error === "network" ? 3000 : 1000; // Longer delay for network errors
        setTimeout(() => {
          if (isMounted && networkErrorCountRef.current < 3) {
            errorOccurredRef.current = false; // Reset flag before retry
            try {
              recognition.start();
              console.log("Recognition restarted after error");
            } catch (e) {
              if (e.name !== "InvalidStateError") console.error(e);
            }
          }
        }, delay);
      } else {
        errorOccurredRef.current = false; // Reset flag if not retrying
      }
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      if (transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
        // Reset network error counter on successful result (recognition is working)
        networkErrorCountRef.current = 0;
        setAiText("");
        setUserText(transcript);
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);
        const data = await getGeminiResponse(transcript);
        handleCommand(data);
        setAiText(data.response);
        setUserText("");
      }
    };


    const greeting = new SpeechSynthesisUtterance(`Hello ${userData.name}, what can I help you with?`);
    greeting.lang = 'hi-IN';

    window.speechSynthesis.speak(greeting);


    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
      recognition.stop();
      setListening(false);
      isRecognizingRef.current = false;
      networkErrorCountRef.current = 0;
    };
  }, []);




  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>
      <CgMenuRight className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer transition-transform duration-200 hover:scale-110 hover:text-blue-400' onClick={() => setHam(true)} />
      <div className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${ham ? "translate-x-0" : "translate-x-full"} transition-transform`}>
        <RxCross1 className='text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer transition-transform duration-200 hover:scale-110 hover:text-blue-400' onClick={() => setHam(false)} />
        <button className='min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-white/30' onClick={handleLogOut}>Log Out</button>
        <button className='min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-white/30' onClick={() => navigate("/customize")}>Customize your Assistant</button>

        <div className='w-full h-[2px] bg-gray-400'></div>
        <h1 className='text-white font-semibold text-[19px]'>History</h1>

        <div className='w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate'>
          {userData.history?.map((his) => (
            <div className='text-gray-200 text-[18px] w-full h-[30px]  '>{his}</div>
          ))}

        </div>

      </div>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px] bg-white rounded-full cursor-pointer text-[19px] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-white/30' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-white/30' onClick={() => navigate("/customize")}>Customize your Assistant</button>
      <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg'>
        <img src={userData?.assistantImage} alt="" className='h-full object-cover' />
      </div>
      <h1 className='text-white text-[18px] font-semibold'>I'm {userData?.assistantName}</h1>
      {!aiText && <img src={userImg} alt="" className='w-[200px]' />}
      {aiText && <img src={aiImg} alt="" className='w-[200px]' />}

      <h1 className='text-white text-[18px] font-semibold text-wrap'>{userText ? userText : aiText ? aiText : null}</h1>

      {!speechRecognitionAvailable && (
        <div className='mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg'>
          <p className='text-yellow-300 text-[14px] text-center'>
            ⚠️ Speech recognition unavailable. Check your internet connection or try refreshing the page.
          </p>
        </div>
      )}

    </div>
  )
}

export default Home;