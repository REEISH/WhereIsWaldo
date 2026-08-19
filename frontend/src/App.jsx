import { useState } from "react";
import "./App.css";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const scenes = [
  {
    id: "doraemon",
    title: "Doraemon",
    src: "/DORAEMON.png",
    characters: ["Doraemon", "Nobita", "Shizuka"],
  },
  {
    id: "it",
    title: "IT Festival",
    src: "/IT.png",
    characters: ["Bill", "Beverly", "Pennywise"],
  },
  {
    id: "lotr",
    title: "Lord of the Rings",
    src: "/LOTR.png",
    characters: ["Aragorn", "Legolas", "Gimli"],
  },
];

export default function WheresWaldoApp() {
  const [activeScene, setActiveScene] = useState(null);
  const [clickPos, setClickPos] = useState(null);
  const [foundCharacters, setFoundCharacters] = useState([]);

  const [feedback, setFeedback] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [gameState, setGameState] = useState("menu");
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const startGame = (scene) => {
    setActiveScene(scene);
    setFoundCharacters([]);
    setClickPos(null);
    setFeedback(null);
    setStartTime(Date.now());
    setGameState("playing");
  };

  const showFeedback = (text, isSuccess) => {
    setFeedback({ text, isSuccess });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleImageClick = (e) => {
    if (gameState !== "playing") return;

    const rect = e.target.getBoundingClientRect();
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    const relativeX = (x / rect.width) * 100;
    const relativeY = (y / rect.height) * 100;

    setClickPos({ x, y, relativeX, relativeY });
  };

  const handleCharacterSelect = async (character) => {
    try {
      const response = await fetch(`${API_URL}/api/game/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapSlug: activeScene.id,
          characterName: character,
          clickX: clickPos.relativeX,
          clickY: clickPos.relativeY,
        }),
      });

      const data = await response.json();

      if (data.found) {
        showFeedback(`✅ ${data.message}`, true);
        const updatedFound = foundCharacters.filter(
          (c) => c.name !== character,
        );
        const newFound = [
          ...updatedFound,
          { name: character, x: clickPos.relativeX, y: clickPos.relativeY },
        ];

        setFoundCharacters(newFound);

        if (newFound.length === activeScene.characters.length) {
          const timeTaken = (Date.now() - startTime) / 1000;
          setScore(timeTaken);
          setGameState("won");
        }
      } else {
        showFeedback(`❌ ${data.message}`, false);
      }
    } catch {
      showFeedback("❌ Server error", false);
    }
    setClickPos(null);
  };

  const submitScore = async () => {
    await fetch(`${API_URL}/api/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapSlug: activeScene.id,
        playerName: playerName || "Anonymous",
        timeInSeconds: score,
      }),
    });
    setGameState("menu");
  };

  const viewLeaderboard = async (scene) => {
    setLeaderboardLoading(true);
    setLeaderboardData({ title: scene.title, scores: [] });
    try {
      const res = await fetch(`${API_URL}/api/leaderboard/${scene.id}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setLeaderboardData({ title: scene.title, scores: data });
      } else {
        console.error("Backend returned an error:", data);
        setLeaderboardData({ title: scene.title, scores: [] });
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    }
    setLeaderboardLoading(false);
  };

  // --- GAME VIEW ---
  if (gameState !== "menu" && activeScene) {
    const remaining = activeScene.characters.filter(
      (c) => !foundCharacters.some((f) => f.name === c),
    );

    return (
      <div className="app-container game-view">
        <div className="game-header">
          <h2 className="scene-title">{activeScene.title}</h2>

          {feedback && (
            <div
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                fontWeight: "bold",
                backgroundColor: feedback.isSuccess ? "#dcfce7" : "#fee2e2",
                color: feedback.isSuccess ? "#166534" : "#991b1b",
              }}
            >
              {feedback.text}
            </div>
          )}

          <button onClick={() => setGameState("menu")} className="play-btn">
            ← Quit
          </button>
        </div>

        {gameState === "won" ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "#fff",
              borderRadius: "8px",
              border: "2px solid #000",
            }}
          >
            <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
              You found everyone!
            </h2>
            <p style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              Time: <strong>{score.toFixed(2)} seconds</strong>
            </p>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{
                padding: "8px",
                border: "1px solid #ccc",
                marginRight: "10px",
              }}
            />
            <button onClick={submitScore} className="play-btn">
              Submit Score
            </button>
          </div>
        ) : (
          <div className="game-image-container" style={{ textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                lineHeight: 0,
              }}
            >
              <img
                src={activeScene.src}
                alt={activeScene.title}
                className="game-img"
                onClick={handleImageClick}
                style={{ display: "block", maxWidth: "100%", height: "auto" }}
              />

              {/* OVERLAY: Strictly overlays the image, holding the markers */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              >
                {foundCharacters.map((char) => (
                  <div
                    key={char.name}
                    style={{
                      position: "absolute",
                      left: `${char.x}%`,
                      top: `${char.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: "40px",
                      height: "40px",
                      border: "4px solid #22c55e",
                      backgroundColor: "rgba(34, 197, 94, 0.3)",
                      borderRadius: "50%",
                      boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                    }}
                  />
                ))}
              </div>

              {/* DROPDOWN: Fixed with hardcoded inline styles so it never breaks layout */}
              {clickPos && (
                <div
                  style={{
                    position: "absolute",
                    left: `${clickPos.x}px`,
                    top: `${clickPos.y}px`,
                    backgroundColor: "white",
                    border: "1px solid #94a3b8",
                    borderRadius: "4px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                    zIndex: 50,
                    minWidth: "150px",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      padding: "8px",
                      backgroundColor: "#f1f5f9",
                      borderBottom: "1px solid #cbd5e1",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    Select a character
                  </div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {remaining.map((char) => (
                      <li
                        key={char}
                        style={{
                          padding: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          borderBottom: "1px solid #eee",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCharacterSelect(char);
                        }}
                      >
                        {char}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MENU VIEW ---
  return (
    <div className="app-container">
      <h1 className="menu-title">Where's Waldo</h1>
      <p className="menu-subtitle">Choose a scene to start playing</p>

      <div className="scenes-wrapper">
        {scenes.map((scene) => (
          <div key={scene.id} className="scene-card">
            <h2 className="scene-title">{scene.title}</h2>
            <div className="thumbnail-container">
              <img
                src={scene.src}
                alt={scene.title}
                className="thumbnail-img"
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => startGame(scene)} className="play-btn">
                Play
              </button>
              <button
                onClick={() => viewLeaderboard(scene)}
                className="play-btn"
                style={{ backgroundColor: "#f3f4f6" }}
              >
                Leaderboard
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* LEADERBOARD MODAL */}
      {leaderboardData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              minWidth: "300px",
              border: "3px solid black",
            }}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              {leaderboardData.title} Top Scores
            </h2>

            {leaderboardLoading ? (
              <p style={{ textAlign: "center" }}>Loading scores...</p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "20px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid black",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "8px" }}>Rank</th>
                    <th style={{ padding: "8px" }}>Player</th>
                    <th style={{ padding: "8px" }}>Time (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.scores.length === 0 ? (
                    <tr>
                      <td
                        colSpan="3"
                        style={{ textAlign: "center", padding: "15px" }}
                      >
                        No scores yet!
                      </td>
                    </tr>
                  ) : (
                    leaderboardData.scores.map((score, index) => (
                      <tr
                        key={score.id}
                        style={{ borderBottom: "1px solid #ccc" }}
                      >
                        <td style={{ padding: "8px" }}>#{index + 1}</td>
                        <td style={{ padding: "8px" }}>{score.playerName}</td>
                        <td style={{ padding: "8px", fontWeight: "bold" }}>
                          {score.timeInSeconds.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            <button
              onClick={() => setLeaderboardData(null)}
              className="play-btn"
              style={{ width: "100%" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
