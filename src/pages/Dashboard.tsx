
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { generateReportSummary, compareSummaries, generateDietPlan } from '../services/ai';
import { Upload, FileText, PlusCircle } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import Navbar from '../components/Navbar';

// Import the worker directly
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url'

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Report {
  id: string;
  userId: string;
  fileName: string;
  date: string;
  summary: string;
  comparison?: string;
  dietPlan?: string;
}

const Dashboard = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('**')) {
        return (
          <h4 key={index} className="text-lg font-bold text-gray-800 mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </h4>
        );
      } else if (line.startsWith('* ')) {
        return (
          <li key={index} className="ml-4 text-gray-700 mb-2">
            {line.replace('* ', '').replace(/\*\*/g, '')}
          </li>
        );
      }
      return (
        <p key={index} className="text-gray-600 mb-2">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    });
  };

  // Add this effect for index creation
  // useEffect(() => {
  //   const ensureIndexExists = async () => {
  //     if (!currentUser) return;
      
  //     try {
  //       const reportsRef = collection(db, 'reports');
  //       const testQuery = query(
  //         reportsRef,
  //         where('userId', '==', currentUser.uid),
  //         orderBy('date', 'desc')
  //       );
  //       await getDocs(testQuery);
  //     } catch (indexError: unknown) {
  //       if (indexError instanceof Error && indexError.message.includes('indexes?create_composite')) {
  //         console.log('Index needs to be created. Please wait...');
  //         setError('Setting up database indexes. This may take a few moments...');
  //       }
  //     }
  //   };

  //   ensureIndexExists();
  // }, [currentUser]);

  // Add this effect to load reports
  useEffect(() => {
    const loadInitialReports = async () => {
      if (currentUser) {
        try {
          setLoading(true);
          await loadReports();
        } catch (err) {
          console.error('Error loading initial reports:', err);
          setError('Failed to load your reports');
        } finally {
          setLoading(false);
        }
      }
    };

    loadInitialReports();
  }, [currentUser]);
  
  const loadReports = async () => {
    if (!currentUser) return;

    try {
      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef,
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const reportsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      
      setReports(reportsList);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('Failed to load reports');
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ');
      fullText += pageText + ' ';
    }

    return fullText.trim();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentUser) return;
  
    setLoading(true);
    setError('');
  
    try {
      // Extract text from PDF without storing it
      const pdfText = await extractTextFromPDF(selectedFile);
  
      // Generate initial summary
      const summary = await generateReportSummary(pdfText);
  
      // Check for previous reports and create comparison
      const reportsRef = collection(db, 'reports');
      const prevReportsQuery = query(
        reportsRef,
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc'),
        limit(1)
      );
      
      const prevReportsSnapshot = await getDocs(prevReportsQuery);
      
      // Create report object with required fields first
      const newReport: Omit<Report, 'id'> = {
        userId: currentUser.uid,
        fileName: selectedFile.name,
        date: new Date().toISOString(),
        summary: summary
      };
  
      // Add optional fields only if they exist
      if (!prevReportsSnapshot.empty) {
        const prevReport = prevReportsSnapshot.docs[0].data() as Report;
        const comparisonResult = await compareSummaries(prevReport.summary, summary);
        if (comparisonResult) {
          newReport.comparison = comparisonResult;
        }
      }
  
      // Generate and add diet plan only if successful
      try {
        const dietPlanResult = await generateDietPlan(summary);
        if (dietPlanResult) {
          newReport.dietPlan = dietPlanResult;
        }
      } catch (dietError) {
        console.error('Error generating diet plan:', dietError);
      }
  
      // Add to Firestore
      await addDoc(collection(db, 'reports'), newReport);
  
      // Refresh reports list
      await loadReports();
      setSelectedFile(null);
  
    } catch (err) {
      console.error('Error processing report:', err);
      setError(err instanceof Error ? err.message : 'Failed to process report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
  
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
  
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload New Report</h2>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
  
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Your Reports</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Loading your reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <PlusCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reports</h3>
              <p className="mt-1 text-sm text-gray-500">Upload your first medical report to get started</p>
            </div>
          ) : (
            <div className="space-y-8">
              {reports.map((report) => (
                <div key={report.id} className="border rounded-lg p-6 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">{report.fileName}</h3>
                    <span className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                      {new Date(report.date).toLocaleDateString()}
                    </span>
                  </div>
  
                  <div className="space-y-6">
                    {/* Summary Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                        Report Summary
                      </h4>
                      <div className="prose prose-sm max-w-none">
                        {formatMarkdown(report.summary)}
                      </div>
                    </div>
  
                    {/* Comparison Section */}
                    {report.comparison && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Changes from Previous Report
                        </h4>
                        <div className="prose prose-sm max-w-none">
                          {formatMarkdown(report.comparison)}
                        </div>
                      </div>
                    )}
                    
                    {/* Button to view diet plan if available */}
                    {report.dietPlan && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => navigate('/diet-plan')}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          View Diet Plan
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;