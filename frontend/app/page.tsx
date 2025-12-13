'use client';

import { useEffect, useState, useRef } from 'react';
import { FunctionCallHandler, nanoid } from 'ai';
import { Message, useChat } from 'ai/react';
import { ErrorBoundary } from "react-error-boundary";
import dynamic from 'next/dynamic';
import RiskAnalysisTable from '@/components/home/risktable';
import Home, { HomeProps } from '@/components/home';
import Sidebar from "@/components/sidebar"
import Head from 'next/head';
import { parseStreamingFunctionCall, parseStreamingJsonString } from '../lib/parseStreamingJson';
import Risko from '../components/riskrepo/risk';
import Chart from '../components/charts/chart'
import CrimeChart from '../components/crimechart/crimechart'
import { ElevenLabsClient, play } from "elevenlabs";
const kmlFileUrls = [
  '/kml/stormwaterdrains.kml',
  '/kml/waterdepth.kml',
  "/kml/flood.kml",
  "/kml/kaaqms.kml",
  "/kml/cctv.kml",
  "/kml/firestations.kml",
  "/kml/slums.kml",
];


const elevenlabs = new ElevenLabsClient({
  apiKey: 'sk_2f5f613f0236eadc1f9730d16f2d6c2bfcdea56ede7a550b',
});


const PoliciesTable = ({ policies }) => {
  return (
    <div className="overflow-x-auto relative">
      <table className="w-full text-sm text-left rounded-md text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 rounded-md">
          <tr>
            <th scope="col" className="py-3 px-6">Policy Name</th>
            <th scope="col" className="py-3 px-6">Annual Premium</th>
            <th scope="col" className="py-3 px-6">Building Coverage</th>
            <th scope="col" className="py-3 px-6">Content Coverage</th>
            <th scope="col" className="py-3 px-6">Natural Disasters</th>
            <th scope="col" className="py-3 px-6">Theft</th>
            <th scope="col" className="py-3 px-6">Deductible</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy, index) => (
            <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">{policy.name}</td>
              <td className="py-4 px-6">{policy.details["Annual Premium"]}</td>
              <td className="py-4 px-6">{policy.details["Building Coverage"]}</td>
              <td className="py-4 px-6">{policy.details["Content Coverage"]}</td>
              <td className="py-4 px-6">{policy.details["Natural Disasters"]}</td>
              <td className="py-4 px-6">{policy.details["Theft"]}</td>
              <td className="py-4 px-6">{policy.details["Deductible"]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
const iconMapping = {
  'waterdepth': '/icons/yellow.png',
  'flood': '/icons/red.png',
  'kaaqms': '/icons/airquality.svg',
  'cctv': '/icons/cctv-camera.png',
  'firestations': '/icons/firestation.png'

};
const Form = dynamic(() => import('../components/form'), { ssr: false });

const Map = dynamic(() => import('../components/map/map'), {
  ssr: false,
});


function fallbackRender({ error, resetErrorBoundary }: any) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
const roleToColorMap: Record<Message['role'], string> = {
  system: 'red',
  user: 'black',
  function: 'blue',
  tool: 'purple',
  assistant: 'green',
  data: 'orange',
};

export default function Chat() {
  const functionCallHandler: FunctionCallHandler = async (
    chatMessages,
    functionCall,
  ) => {
    if (functionCall.name === 'eval_code_in_browser') {
      if (functionCall.arguments) {
        try {
          const parsedFunctionCallArguments: { code: string } = parseStreamingJsonString(
            functionCall.arguments,
          );
          console.log('parsedFunctionCallArguments', parsedFunctionCallArguments);
          eval(parsedFunctionCallArguments.code);
          const functionResponse = {
            messages: [
              ...chatMessages,
              {
                id: nanoid(),
                name: 'eval_code_in_browser',
                role: 'function' as const,
                content: parsedFunctionCallArguments.code,
              },
            ],
          };

          return functionResponse;
        } catch (error) {
          console.error(error);
          return;
        }
      }
    }
  };

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'home' | 'tools'>('home')
  const [apiKey, setApiKey] = useState<string | null>(null);

  const [modelResponse, setModelResponse] = useState<any>(null);
  const { messages, input, handleInputChange, handleSubmit, append } = useChat({
    api: '/api/chat-with-functions',
    body: {
      apiKey,
    },
    experimental_onFunctionCall: functionCallHandler,
  });

  const submitFirstQuery: HomeProps['runQuery'] = ({ query, apiKey }) => {
    setQuery(query);
    setApiKey(apiKey);
    append({
      id: nanoid(),
      role: 'user',
      content: query,
      createdAt: new Date(),
    }, {
      options: {
        body: {
          apiKey,
        }
      }
    });
    setMode('tools');
  };

  const onSubmitFormComponent = async (formValues: any) => {
    const formEntries = Object.entries(formValues.formData).map(([key, value]) => `${key}: ${value}`);
    const formDetails = formEntries.join(', ');

    const messageContent = "No response";

    setModelResponse(messageContent);
    // 
    const formResponse: Message = {
      id: nanoid(),
      name: 'create_simple_form',
      role: 'function' as const,
      // content: formValues,
      content: JSON.stringify(formValues.formData),
      // content: (formValues.formData),
    };
    append(formResponse);
  }

  const isBigMessage = (message: Message) => {
    return message.function_call && JSON.stringify(message.function_call).includes('create_dynamic_map')
  };
  const bigMessages = messages.filter(isBigMessage);
  const chatMessages = messages.filter((msg) => !isBigMessage(msg))
    .filter(message => message.role !== 'system' && message.role !== 'function')

  const bigMessage = bigMessages[bigMessages.length - 1];

  return (
    <>
      <Head>
        <title>BangMaps</title>
      </Head>
      <div className={`mode-${mode}`}>
        {mode === 'home' && (
          <Home runQuery={submitFirstQuery} />
        )}
        {mode === 'tools' && (
          <div className={"tools"}>
            <Sidebar messages={chatMessages} onSubmitFormComponent={onSubmitFormComponent} ShowMessage={ShowMessage}>
              {bigMessage && <ShowMessage message={bigMessage} onSubmitFormComponent={onSubmitFormComponent} modelResponse={modelResponse} />}
            </Sidebar>
          </div>
        )}
      </div>
    </>
  )
}

function ShowMessage({ message: m, onSubmitFormComponent, modelResponse }: { message: Message, onSubmitFormComponent: any, modelResponse: any }) {
  const isFunctionCallDone = typeof m.function_call === 'object';
  return (
    <div
      key={m.id}
      className="whitespace-pre-wrap"
      style={{ color: roleToColorMap[m.role] }}
    >
      <strong>{`${m.role.toUpperCase()}: `}</strong>

      {m.content ? (
        m.content
      ) :
        (<>
          <ErrorBoundary
            fallbackRender={fallbackRender}
            // resetKeys={[JSON.stringify(json)]}>
            resetKeys={[JSON.stringify(m.function_call)]}>
            <div>{isFunctionCallDone ? "" : "Writing..."}</div>
            <DynamicComponent functionCall={m.function_call} onSubmit={onSubmitFormComponent} modelResponse={modelResponse} />
          </ErrorBoundary>
        </>
        )}
      <br />
      <br />
    </div>
  );
}


function DynamicComponent({ functionCall: functionCallRaw, onSubmit, modelResponse }: any) {
  const audioPlayedRef = useRef(false);
  const prevState = useRef<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const apiCalledRef = useRef(false);
  const [showAdditionalComponents, setShowAdditionalComponents] = useState(false);
  const [loadedKmlFiles, setLoadedKmlFiles] = useState<string[]>([]);

  // First useEffect - for analysis data
  useEffect(() => {
    const fetchAnalysis = async () => {
      const { startPosition } = prevState.current;
      if (startPosition &&
        startPosition.length === 2 &&
        !apiCalledRef.current &&
        !isLoading) {

        setIsLoading(true);
        apiCalledRef.current = true;

        try {
          const response = await fetch('http://127.0.0.1:5000/riskanalysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              circles: [
                {
                  center: {
                    lat: startPosition[0],
                    lng: startPosition[1],
                  },
                  radius: 1000,
                }
              ]
            }),
          });

          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          const data = await response.json();
          setAnalysisData(data.data);
          setTimeout(() => setShowAdditionalComponents(true), 1000);
        } catch (error) {
          console.error('There was a problem with the fetch operation:', error);
          setAnalysisData(null);
          setShowAdditionalComponents(true);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchAnalysis();
  }, [isLoading]);

  useEffect(() => {
    const playAudio = async () => {
      const { startPosition } = prevState.current;
      if (startPosition && modelResponse?.verdict && !audioPlayedRef.current) {
        audioPlayedRef.current = true;
        try {
          const audio = await elevenlabs.generate({
            voice: "Sarah",
            text: modelResponse.verdict,
            model_id: "eleven_multilingual_v2",
          });
          await play(audio);
        } catch (error) {
          console.error('Error generating or playing audio:', error);
        }
      }
    };

    setTimeout(playAudio, 3000);
  }, [modelResponse]);

  // Third useEffect - for KML files
  useEffect(() => {
    const essentialKmlFiles = ['/kml/flood.kml', '/kml/waterdepth.kml'];
    setLoadedKmlFiles(essentialKmlFiles);

    const timer = setTimeout(() => {
      setLoadedKmlFiles(kmlFileUrls);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!functionCallRaw) {
    return null;
  }
  const functionCallJson = typeof functionCallRaw === 'string' ? parseStreamingFunctionCall(functionCallRaw) : functionCallRaw;

  const functionCall = functionCallJson.function_call ?? functionCallJson;

  if (functionCall.name === 'create_simple_form') {
    if (!functionCall.arguments) {
      return <div>
        Writing form...
      </div>
    }
    const args = parseStreamingJsonString(functionCall.arguments) ?? {};
    try {
      const { jsonSchema: jsonSchemaString, uiSchema: uiSchemaString } = args;
      const jsonSchema = jsonSchemaString ? parseStreamingJsonString(jsonSchemaString) : {};
      const uiSchema = uiSchemaString ? parseStreamingJsonString(uiSchemaString) : {};
      prevState.current.args = args;
      prevState.current.jsonSchema = jsonSchema;
      prevState.current.uiSchema = uiSchema;
    } catch (error) {
      console.error(error);
    }

    const { jsonSchema, uiSchema } = prevState.current;

    return <div>
      <ErrorBoundary
        fallbackRender={fallbackRender}
        resetKeys={[JSON.stringify(jsonSchema), JSON.stringify(uiSchema)]}>
        <Form jsonSchema={jsonSchema} uiSchema={uiSchema} onSubmit={onSubmit} />
      </ErrorBoundary>
    </div>
  }
  else if (functionCall.name === 'create_dynamic_map') {
    if (!functionCall.arguments) {
      return <div>
        Map...
      </div>
    }
    try {
      const args = parseStreamingJsonString(functionCall.arguments);
      const locationToPoint = (loc: any) => ((loc && loc?.lat && loc?.lon) ? [loc.lat, loc.lon] : null);
      const centerPosition = args?.center ? locationToPoint(args?.center) : null
      const zoomLevel = args?.zoomLevel ?? 25;
      const markers = args?.markers?.map((marker, markerIndex) => ({
        label: `${markerIndex + 1}. ${marker?.label}`,
        position: locationToPoint(marker),
        color: marker?.color,
      })) ?? [];
      const readyMarkers = markers.filter(marker => {
        const hasPosition = marker.position && marker.position.length === 2 && marker.position.every(x => typeof x === 'number');
        return hasPosition;
      });
      const startPosition = centerPosition ?? (
        readyMarkers.length > 0 ? (readyMarkers.reduce((acc, marker) => {
          acc[0] += marker.position[0];
          acc[1] += marker.position[1];
          return acc;
        }, [0, 0])
          .map(x => x / readyMarkers.length)
        ) : null);
      prevState.current.startPosition = startPosition;
      prevState.current.markers = readyMarkers;
      prevState.current.zoomLevel = zoomLevel;
    } catch (error) {
      console.error('Error parsing map arguments:', error);
    }

    const { startPosition, markers, zoomLevel } = prevState.current;

    return (
      <div>
        <div style={{ 'height': '100vh' }}>
          <ErrorBoundary fallbackRender={fallbackRender} resetKeys={[JSON.stringify(startPosition), JSON.stringify(markers)]}>
            {startPosition && (
              <Map
                center={startPosition}
                markers={markers}
                zoomLevel={25}
                kmlFiles={loadedKmlFiles}
                iconMapping={iconMapping}
              />
            )}
          </ErrorBoundary>
        </div>

        {showAdditionalComponents && (
          <>
            <div>
              <RiskAnalysisTable analysisData={analysisData} />
            </div>
            <div>
              <Chart />
            </div>
            <div>
              <CrimeChart />
            </div>
            <div>
              <div className="p-4">
                <div>
                  {<Risko analysisData={analysisData} />}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );

  }

  if (JSON.stringify(functionCall).includes('create_simple_form')) {
    console.log('weird', functionCall);
  }

  return <>
    <div>Cooking...</div>
  </>
}
