import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  message: string;
};

function App(){
  const [message, setMessage] = useState("APIへ接続中．．．");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try{
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

        const response = await fetch(`${apiBaseUrl}/api/health`,{
          credentials: "include",
        });

        if(!response.ok){
          throw new Error(`HTTPエラー:${response.status}`);
        }

        const data: HealthResponse = await response.json();
        setMessage(data.message);
      } catch(fetchError){
        const errorMessage =
          fetchError instanceof Error ? fetchError.message : "不明なエラーが発生しました";

        setError(errorMessage);
      }
    };

    void fetchHealth();
  }, []);

  return(
    <main>
      <h1>会議室予約システム</h1>

      {error ? (
        <p>API接続失敗: {error}</p>
      ) : (
        <p>{message}</p>
      )}
    </main>
  );
}

export default App;