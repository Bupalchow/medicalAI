import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Utensils, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';

interface Report {
  id: string;
  userId: string;
  fileName: string;
  date: string;
  summary: string;
  comparison?: string;
  dietPlan?: string;
}

const DietPlan = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [latestDietPlan, setLatestDietPlan] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadLatestDietPlan = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const reportsRef = collection(db, 'reports');
        const q = query(
          reportsRef,
          where('userId', '==', currentUser.uid),
          where('dietPlan', '!=', null),
          orderBy('date', 'desc'),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          // No diet plan found
          setLatestDietPlan(null);
          return;
        }
        
        const latestReport = querySnapshot.docs[0].data() as Report;
        setLatestDietPlan(latestReport.dietPlan || null);
      } catch (err) {
        console.error('Error loading diet plan:', err);
        setError('Failed to load your diet plan');
      } finally {
        setLoading(false);
      }
    };

    loadLatestDietPlan();
  }, [currentUser]);

  const formatDietPlan = (dietPlan: string) => {
    const sections = dietPlan.split('\n\n');
    const formattedSections: { [key: string]: string[] } = {
      goals: [],
      greenFoods: [],
      yellowFoods: [],
      redFoods: [],
      timing: [],
      special: []
    };
  
    let currentSection = 'goals';
    sections.forEach(section => {
      // Clean up the section text and remove markdown
      const cleanSection = section
        .replace(/\*\*/g, '')
        .replace(/^[-*]\s+/gm, '')
        .trim();
  
      if (section.toLowerCase().includes('foods to eat freely') || 
          section.toLowerCase().includes('green foods')) {
        currentSection = 'greenFoods';
      } else if (section.toLowerCase().includes('foods in moderation') || 
                 section.toLowerCase().includes('yellow foods')) {
        currentSection = 'yellowFoods';
      } else if (section.toLowerCase().includes('foods to avoid') || 
                 section.toLowerCase().includes('red foods')) {
        currentSection = 'redFoods';
      } else if (section.toLowerCase().includes('meal timing')) {
        currentSection = 'timing';
      } else if (section.toLowerCase().includes('special instructions') || 
                 section.toLowerCase().includes('special dietary')) {
        currentSection = 'special';
      } else if (cleanSection) {
        // Split section into individual items if it contains bullet points
        const items = cleanSection.split('\n')
          .map(item => item.trim())
          .filter(item => item.length > 0);
  
        // Add items to current section
        formattedSections[currentSection].push(...items);
      }
    });
  
    // Clean up and format each section's items
    Object.keys(formattedSections).forEach(key => {
      formattedSections[key] = formattedSections[key]
        .map(item => {
          return item
            .replace(/^[-*•]\s*/, '') // Remove bullet points
            .replace(/\*\*/g, '')     // Remove bold markdown
            .replace(/^\d+\.\s*/, '') // Remove numbered lists
            .trim();
        })
        .filter(item => item.length > 0); // Remove empty items
    });
  
    return formattedSections;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Your Personalized Diet Plan</h1>
          <p className="mt-2 text-gray-600">
            Based on your latest medical report analysis
          </p>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading your diet plan...</p>
          </div>
        ) : !latestDietPlan ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="mt-4 text-lg font-medium text-gray-900">No Diet Plan Available</h2>
            <p className="mt-2 text-gray-500">
              Upload a medical report to get a personalized diet plan recommendation.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-xl p-8">
            {(() => {
              const diet = formatDietPlan(latestDietPlan);
              return (
                <div className="space-y-8">
                  {/* Dietary Goals */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                    <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Dietary Goals
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-blue-800">
                      {diet.goals.map((goal, idx) => (
                        <li key={idx}>{goal}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Food Categories */}
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4">
                    <Utensils className="h-6 w-6 mr-2" />
                    Your Food Guide
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Green Foods */}
                    <div className="bg-green-50 rounded-xl p-6 border-l-4 border-green-500 shadow-sm">
                      <h3 className="text-lg font-bold text-green-800 mb-3">
                        Foods to Eat Freely
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-green-700">
                        {diet.greenFoods.map((food, idx) => (
                          <li key={idx}>{food}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Yellow Foods */}
                    <div className="bg-yellow-50 rounded-xl p-6 border-l-4 border-yellow-500 shadow-sm">
                      <h3 className="text-lg font-bold text-yellow-800 mb-3">
                        Foods in Moderation
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-yellow-700">
                        {diet.yellowFoods.map((food, idx) => (
                          <li key={idx}>{food}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Red Foods */}
                    <div className="bg-red-50 rounded-xl p-6 border-l-4 border-red-500 shadow-sm">
                      <h3 className="text-lg font-bold text-red-800 mb-3">
                        Foods to Avoid
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-red-700">
                        {diet.redFoods.map((food, idx) => (
                          <li key={idx}>{food}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Additional Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {/* Meal Timing */}
                    <div className="bg-purple-50 rounded-xl p-6 border-l-4 border-purple-500 shadow-sm">
                      <h3 className="text-lg font-bold text-purple-900 mb-3">
                        Meal Timing Recommendations
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-purple-800">
                        {diet.timing.map((timing, idx) => (
                          <li key={idx}>{timing}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Special Instructions */}
                    {diet.special.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-6 border-l-4 border-gray-500 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">
                          Special Instructions
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-gray-800">
                          {diet.special.map((instruction, idx) => (
                            <li key={idx}>{instruction}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
};

export default DietPlan;