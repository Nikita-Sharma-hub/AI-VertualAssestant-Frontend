import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif"

function Home() {

  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext)

  const navigate = useNavigate()

  const [listening, setListening] = useState(false)
  const [userText, setUserText] = useState("")
  const [aiText, setAiText] = useState("")
  const [ham, setHam] = useState(false)
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(true)

  const recognitionRef = useRef(null)
  const isRecognizingRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const isMountedRef = useRef(true)
  const restartTimeoutRef = useRef(null)

  const synth = window.speechSynthesis


  // =========================
  // LOGOUT
  // =========================

  const handleLogOut = async () => {
    try {

      await axios.get(
        `${serverUrl}/api/auth/logout`,
        { withCredentials: true }
      )

      setUserData(null)
      navigate("/signin")

    } catch (error) {

      setUserData(null)
      console.log(error)

    }
  }


  // =========================
  // START RECOGNITION
  // =========================

  const startRecognition = () => {

    const recognition = recognitionRef.current

    if (!recognition) return

    if (isSpeakingRef.current) return

    if (isRecognizingRef.current) return

    try {

      recognition.start()

      console.log("🎤 Recognition requested")

    } catch (error) {

      if (error.name !== "InvalidStateError") {
        console.error("Recognition start error:", error)
      }

    }
  }


  // =========================
  // SPEAK
  // =========================

  const speak = (text) => {

    if (!text) return

    isSpeakingRef.current = true

    const utterance = new SpeechSynthesisUtterance(text)

    utterance.lang = 'hi-IN'

    const voices = window.speechSynthesis.getVoices()

    const hindiVoice = voices.find(
      voice => voice.lang === 'hi-IN'
    )

    if (hindiVoice) {
      utterance.voice = hindiVoice
    }

    utterance.onend = () => {

      isSpeakingRef.current = false

      setAiText("")

      // Start listening again after AI finishes speaking
      setTimeout(() => {

        if (
          isMountedRef.current &&
          !isSpeakingRef.current &&
          !isRecognizingRef.current
        ) {

          startRecognition()

        }

      }, 800)

    }

    synth.cancel()
    synth.speak(utterance)
  }


  // =========================
  // HANDLE COMMAND
  // =========================

  const handleCommand = (data) => {

    if (!data) return

    const { type, userInput, response } = data

    speak(response)


    if (type === 'google-search') {

      const query = encodeURIComponent(userInput)

      window.location.href =
        `https://www.google.com/search?q=${query}`

    }


    if (type === 'calculator-open') {

      window.location.href =
        `https://www.google.com/search?q=calculator`

    }


    if (type === "instagram-open") {

      window.location.href =
        `https://www.instagram.com/`

    }


    if (type === "facebook-open") {

      window.location.href =
        `https://www.facebook.com/`

    }


    if (type === "weather-show") {

      window.location.href =
        `https://www.google.com/search?q=weather`

    }


    if (
      type === 'youtube-search' ||
      type === 'youtube-play'
    ) {

      const query = encodeURIComponent(userInput)

      window.location.href =
        `https://www.youtube.com/results?search_query=${query}`

    }

  }


  // =========================
  // SPEECH RECOGNITION
  // =========================

  useEffect(() => {

    isMountedRef.current = true

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition


    // Browser doesn't support Speech Recognition
    if (!SpeechRecognition) {

      console.error(
        "Speech Recognition is not supported in this browser."
      )

      setSpeechRecognitionAvailable(false)

      return

    }


    const recognition = new SpeechRecognition()


    recognition.continuous = true
    recognition.lang = 'en-US'
    recognition.interimResults = false


    recognitionRef.current = recognition


    // =========================
    // ON START
    // =========================

    recognition.onstart = () => {

      console.log("🎤 Speech recognition STARTED")

      isRecognizingRef.current = true

      setListening(true)

      setSpeechRecognitionAvailable(true)

    }


    // =========================
    // ON RESULT
    // =========================

    recognition.onresult = async (event) => {

      try {

        const transcript =
          event.results[
            event.results.length - 1
          ][0].transcript.trim()


        console.log("🗣️ Heard:", transcript)


        if (!transcript) return


        const assistantName =
          userData?.assistantName?.toLowerCase()


        if (!assistantName) return


        if (
          transcript
            .toLowerCase()
            .includes(assistantName)
        ) {

          console.log(
            "✅ Assistant name detected"
          )


          // Stop listening before processing command
          try {
            recognition.stop()
          } catch (error) {
            console.log(error)
          }


          isRecognizingRef.current = false

          setListening(false)

          setUserText(transcript)

          setAiText("")


          // Get Gemini response
          const data =
            await getGeminiResponse(transcript)


          if (!data) {

            console.error(
              "No response from Gemini"
            )

            return

          }


          setAiText(data.response)

          setUserText("")

          handleCommand(data)

        }

      } catch (error) {

        console.error(
          "Speech result error:",
          error
        )

      }

    }


    // =========================
    // ON ERROR
    // =========================

    recognition.onerror = (event) => {

      console.warn(
        "🎤 Speech recognition error:",
        event.error
      )


      isRecognizingRef.current = false

      setListening(false)


      // Permission denied
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {

        setSpeechRecognitionAvailable(false)

        return

      }


      // No speech is NOT a fatal error
      if (event.error === "no-speech") {

        console.log(
          "No speech detected."
        )

        return

      }


      // Network error
      if (event.error === "network") {

        console.warn(
          "Speech recognition network error."
        )

        // Don't create an infinite restart loop
        setSpeechRecognitionAvailable(false)

        return

      }


      // Aborted is normally caused by stop()
      if (event.error === "aborted") {

        console.log(
          "Speech recognition aborted."
        )

        return

      }

    }


    // =========================
    // ON END
    // =========================

    recognition.onend = () => {

      console.log(
        "🎤 Speech recognition ENDED"
      )


      isRecognizingRef.current = false

      setListening(false)


      // IMPORTANT:
      // Do NOT automatically restart here.
      //
      // Automatic restart was causing:
      // network -> restart -> aborted -> restart
      //
      // Recognition will be started again only
      // after AI finishes speaking.

    }


    // =========================
    // GREETING
    // =========================

    const greeting =
      new SpeechSynthesisUtterance(
        `Hello ${userData?.name || ""}, what can I help you with?`
      )

    greeting.lang = 'hi-IN'


    window.speechSynthesis.speak(greeting)


    // Start recognition AFTER greeting finishes
    greeting.onend = () => {

      if (
        isMountedRef.current &&
        !isSpeakingRef.current &&
        !isRecognizingRef.current
      ) {

        setTimeout(() => {

          startRecognition()

        }, 800)

      }

    }


    // =========================
    // CLEANUP
    // =========================

    return () => {

      isMountedRef.current = false

      clearTimeout(
        restartTimeoutRef.current
      )

      try {

        recognition.stop()

      } catch (error) {

        console.log(error)

      }

      recognitionRef.current = null

      isRecognizingRef.current = false

      setListening(false)

    }

  }, [])


  // =========================
  // UI
  // =========================

  return (

    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>


      {/* MOBILE MENU */}

      <CgMenuRight
        className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer transition-transform duration-200 hover:scale-110 hover:text-blue-400'
        onClick={() => setHam(true)}
      />


      <div
        className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${ham
          ? "translate-x-0"
          : "translate-x-full"
          } transition-transform`}
      >

        <RxCross1
          className='text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer transition-transform duration-200 hover:scale-110 hover:text-blue-400'
          onClick={() => setHam(false)}
        />


        <button
          className='min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-white/30'
          onClick={handleLogOut}
        >
          Log Out
        </button>


        <button
          className='min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-white/30'
          onClick={() => navigate("/customize")}
        >
          Customize your Assistant
        </button>


        <div className='w-full h-[2px] bg-gray-400'></div>


        <h1 className='text-white font-semibold text-[19px]'>
          History
        </h1>


        <div className='w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate'>

          {userData?.history?.map((his, index) => (

            <div
              key={index}
              className='text-gray-200 text-[18px] w-full h-[30px]'
            >
              {his}
            </div>

          ))}

        </div>

      </div>


      {/* DESKTOP BUTTONS */}

      <button
        className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px] bg-white rounded-full cursor-pointer text-[19px] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-white/30'
        onClick={handleLogOut}
      >
        Log Out
      </button>


      <button
        className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-white/30'
        onClick={() => navigate("/customize")}
      >
        Customize your Assistant
      </button>


      {/* ASSISTANT IMAGE */}

      <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg'>

        <img
          src={userData?.assistantImage}
          alt=""
          className='h-full object-cover'
        />

      </div>


      <h1 className='text-white text-[18px] font-semibold'>
        I'm {userData?.assistantName}
      </h1>


      {!aiText && (
        <img
          src={userImg}
          alt=""
          className='w-[200px]'
        />
      )}


      {aiText && (
        <img
          src={aiImg}
          alt=""
          className='w-[200px]'
        />
      )}


      <h1 className='text-white text-[18px] font-semibold text-wrap'>

        {userText
          ? userText
          : aiText
            ? aiText
            : null}

      </h1>


      {!speechRecognitionAvailable && (

        <div className='mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg'>

          <p className='text-yellow-300 text-[14px] text-center'>

            ⚠️ Speech recognition is currently unavailable.
            Please refresh the page and try again.

          </p>

        </div>

      )}

    </div>

  )

}

export default Home