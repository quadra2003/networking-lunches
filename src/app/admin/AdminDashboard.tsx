'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { runMatchingAlgorithm } from '@/lib/matching-algorithm';

// Types for the admin dashboard
type Participant = {
  id: string;
  name: string;
  email: string;
  barNumber?: string;
  practiceAreas: string[];
  experienceLevel: string;
  networkingGoals: string[];
  availability: string[];
  locations: string[];
  useSeparateLocations: boolean;
  weekdayLunchLocations?: string[];
  weekdayDinnerLocations?: string[];
  weekendLunchLocations?: string[];
  weekendDinnerLocations?: string[];
  submittedAt: Timestamp;
  status: 'pending' | 'matched' | 'emailed';
  matchGroup?: string;
};

type MatchGroup = {
  id: string;
  participants: Participant[];
  meetingTime: string;
  meetingLocation: string;
  isFinalized: boolean;
};

type Cycle = {
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'upcoming';
};

export default function AdminDashboard() {
  const [cycle, setCycle] = useState<string>('March 2025');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'participants' | 'matches' | 'emails'>('participants');
  const [runningMatch, setRunningMatch] = useState<boolean>(false);
  const [sendingEmails, setSendingEmails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Available cycles to select from
  const cycles: Cycle[] = [
    {
      name: 'March 2025',
      startDate: new Date(2025, 2, 1),
      endDate: new Date(2025, 2, 31),
      status: 'active'
    },
    {
      name: 'June 2025',
      startDate: new Date(2025, 5, 1),
      endDate: new Date(2025, 5, 30),
      status: 'upcoming'
    }
  ];
  
  // Load participants data
  useEffect(() => {
    async function loadParticipants() {
      setLoading(true);
      setError(null);
      
      try {
        const surveyRef = collection(db, 'survey-responses');
        const q = query(surveyRef, where('cycle', '==', cycle));
        const querySnapshot = await getDocs(q);
        
        const participantsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Participant[];
        
        setParticipants(participantsData);
        
        // Also load any existing match groups
        const matchesRef = collection(db, 'match-groups');
        const matchesQuery = query(matchesRef, where('cycle', '==', cycle));
        const matchesSnapshot = await getDocs(matchesQuery);
        
        const matchGroupsData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MatchGroup[];
        
        setMatchGroups(matchGroupsData);
      } catch (err) {
        console.error("Error loading participants:", err);
        setError("Failed to load participants data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    loadParticipants();
  }, [cycle]);
  
  // Run the matching algorithm
  const handleRunMatching = async () => {
    setRunningMatch(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Here we would call our matching algorithm
      const newMatchGroups = await runMatchingAlgorithm(participants, cycle);
      setMatchGroups(newMatchGroups);
      setSuccessMessage("Matching completed successfully!");
      setActiveTab('matches');
    } catch (err) {
      console.error("Error running matching algorithm:", err);
      setError("Failed to run matching algorithm. Please try again.");
    } finally {
      setRunningMatch(false);
    }
  };
  
  // Send emails to all participants in finalized match groups
  const handleSendEmails = async () => {
    setSendingEmails(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // In a real implementation, you would integrate with SendGrid or similar
      // For now, let's just update the status
      const finalizedGroups = matchGroups.filter(group => group.isFinalized);
      
      if (finalizedGroups.length === 0) {
        setError("No finalized match groups to send emails to!");
        setSendingEmails(false);
        return;
      }
      
      // Update participant statuses
      for (const group of finalizedGroups) {
        for (const participant of group.participants) {
          const participantRef = doc(db, 'survey-responses', participant.id);
          await updateDoc(participantRef, {
            status: 'emailed',
            matchGroup: group.id
          });
        }
      }
      
      // Refresh participant data
      const surveyRef = collection(db, 'survey-responses');
      const q = query(surveyRef, where('cycle', '==', cycle));
      const querySnapshot = await getDocs(q);
      
      const updatedParticipants = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Participant[];
      
      setParticipants(updatedParticipants);
      setSuccessMessage(`Emails sent to ${finalizedGroups.length} groups!`);
    } catch (err) {
      console.error("Error sending emails:", err);
      setError("Failed to send emails. Please try again.");
    } finally {
      setSendingEmails(false);
    }
  };
  
  // Toggle group finalization status
  const toggleGroupFinalization = async (groupId: string) => {
    try {
      const groupIndex = matchGroups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return;
      
      const updatedGroups = [...matchGroups];
      updatedGroups[groupIndex].isFinalized = !updatedGroups[groupIndex].isFinalized;
      
      // Update in Firestore
      const groupRef = doc(db, 'match-groups', groupId);
      await updateDoc(groupRef, {
        isFinalized: updatedGroups[groupIndex].isFinalized
      });
      
      setMatchGroups(updatedGroups);
    } catch (err) {
      console.error("Error toggling group finalization:", err);
      setError("Failed to update group status.");
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <label className="font-medium">Current Cycle:</label>
          <select 
            value={cycle}
            onChange={(e) => setCycle(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            {cycles.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('participants')}
            className={`py-2 px-4 border-b-2 ${
              activeTab === 'participants' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Participants ({participants.length})
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`py-2 px-4 border-b-2 ${
              activeTab === 'matches' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Match Groups ({matchGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`py-2 px-4 border-b-2 ${
              activeTab === 'emails' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Email Management
          </button>
        </div>
      </div>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      
      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {/* Tab Content */}
      {!loading && (
        <>
          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Registered Participants</h2>
                <button
                  onClick={handleRunMatching}
                  disabled={runningMatch || participants.length < 2}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {runningMatch ? 'Running Matching...' : 'Run Matching Algorithm'}
                </button>
              </div>
              
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Practice Areas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Availability</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map((participant) => (
                      <tr key={participant.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                          <div className="text-sm text-gray-500">{participant.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {participant.practiceAreas.slice(0, 2).join(', ')}
                            {participant.practiceAreas.length > 2 && '...'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.experienceLevel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {participant.availability.join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${participant.status === 'matched' ? 'bg-yellow-100 text-yellow-800' : 
                              participant.status === 'emailed' ? 'bg-green-100 text-green-800' : 
                              'bg-gray-100 text-gray-800'}`}
                          >
                            {participant.status === 'pending' ? 'Awaiting match' : 
                             participant.status === 'matched' ? 'Matched' : 'Email sent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {participants.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No participants registered for this cycle yet.
                </div>
              )}
            </div>
          )}
          
          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Match Groups</h2>
              
              {matchGroups.map((group) => (
                <div key={group.id} className="mb-6 bg-white shadow overflow-hidden rounded-lg">
                  <div className="px-6 py-4 flex justify-between items-center border-b">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Group: {group.meetingTime || 'Time TBD'} at {group.meetingLocation || 'Location TBD'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {group.participants.length} participants
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${group.isFinalized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {group.isFinalized ? 'Finalized' : 'Draft'}
                      </span>
                      <button
                        onClick={() => toggleGroupFinalization(group.id)}
                        className={`px-3 py-1 text-sm rounded ${
                          group.isFinalized 
                            ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {group.isFinalized ? 'Unfinalize' : 'Finalize'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Meeting Options:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <select 
                          value={group.meetingTime || ''}
                          onChange={async (e) => {
                            const updatedGroups = [...matchGroups];
                            const index = updatedGroups.findIndex(g => g.id === group.id);
                            updatedGroups[index].meetingTime = e.target.value;
                            setMatchGroups(updatedGroups);
                            
                            // Update in Firestore
                            const groupRef = doc(db, 'match-groups', group.id);
                            await updateDoc(groupRef, {
                              meetingTime: e.target.value
                            });
                          }}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm"
                        >
                          <option value="">Select a meeting time</option>
                          <option value="Weekday Lunch">Weekday Lunch</option>
                          <option value="Weekday Dinner">Weekday Dinner</option>
                          <option value="Weekend Lunch">Weekend Lunch</option>
                          <option value="Weekend Dinner">Weekend Dinner</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <select 
                          value={group.meetingLocation || ''}
                          onChange={async (e) => {
                            const updatedGroups = [...matchGroups];
                            const index = updatedGroups.findIndex(g => g.id === group.id);
                            updatedGroups[index].meetingLocation = e.target.value;
                            setMatchGroups(updatedGroups);
                            
                            // Update in Firestore
                            const groupRef = doc(db, 'match-groups', group.id);
                            await updateDoc(groupRef, {
                              meetingLocation: e.target.value
                            });
                          }}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm"
                        >
                          <option value="">Select a location</option>
                          <option value="Irvine/Costa Mesa/John Wayne Airport">Irvine/Costa Mesa/John Wayne Airport</option>
                          <option value="Tustin">Tustin</option>
                          <option value="Downtown Santa Ana">Downtown Santa Ana</option>
                          <option value="Irvine Spectrum">Irvine Spectrum</option>
                          <option value="Buena Park/Fullerton/Brea">Buena Park/Fullerton/Brea</option>
                        </select>
                      </div>
                    </div>
                    
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Participants:</h4>
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Practice Area</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Experience</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {group.participants.map((participant) => (
                            <tr key={participant.id}>
                              <td className="px-4 py-2 text-sm">{participant.name}</td>
                              <td className="px-4 py-2 text-sm">{participant.practiceAreas[0]}</td>
                              <td className="px-4 py-2 text-sm">{participant.experienceLevel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
              
              {matchGroups.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No match groups created yet. Run the matching algorithm to create groups.
                </div>
              )}
            </div>
          )}
          
          {/* Emails Tab */}
          {activeTab === 'emails' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Email Management</h2>
              
              <div className="bg-white shadow overflow-hidden rounded-lg p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Send Match Notifications</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Send emails to all participants in finalized match groups. This will notify them of their matches
                    and provide meeting details.
                  </p>
                  
                  <div className="bg-yellow-50 p-4 rounded mb-4">
                    <p className="text-sm text-yellow-700">
                      <strong>Note:</strong> Only finalized groups will receive emails. Please ensure all groups are
                      finalized and have meeting times and locations set before sending.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleSendEmails}
                    disabled={sendingEmails || matchGroups.filter(g => g.isFinalized).length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {sendingEmails ? 'Sending Emails...' : 'Send Match Notification Emails'}
                  </button>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Email Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-sm font-medium text-gray-500">Total Participants</p>
                      <p className="text-2xl font-bold text-gray-900">{participants.length}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-sm font-medium text-gray-500">Emails Sent</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {participants.filter(p => p.status === 'emailed').length}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-sm font-medium text-gray-500">Pending Emails</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {participants.filter(p => p.status === 'matched').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
