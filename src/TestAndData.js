// TestAndData.js
import { View, Text, Button, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { PermissionsAndroid } from 'react-native';
import GoogleFit, { Scopes } from 'react-native-google-fit';

export default function TestAndData() {
  const [steps, setSteps] = useState(0);
  const [heartRate, setHeartRate] = useState('--');
  const [spo2, setSpo2] = useState('--');
  const [authorized, setAuthorized] = useState(false);
  const [lastSync, setLastSync] = useState('Not synced');

  // Request necessary permissions
  const requestPermissions = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: 'Health Data Permission',
          message: 'This app needs access to your health data from wearable devices',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Initialize Google Fit
  const initGoogleFit = async () => {
    try {
      // Check permissions first
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('Permission denied');
        return;
      }
      
      // Connect to Google Fit
      const options = {
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_BODY_READ,
          Scopes.FITNESS_HEART_RATE_READ,
          Scopes.FITNESS_OXYGEN_SATURATION_READ,
        ],
      };
      
      GoogleFit.authorize(options)
        .then(authResult => {
          if (authResult.success) {
            console.log('Google Fit authorization successful');
            setAuthorized(true);
            fetchData();
          } else {
            console.log('Google Fit authorization denied', authResult.message);
          }
        })
        .catch(error => {
          console.log('Google Fit authorization error', error);
        });
    } catch (error) {
      console.log('Error initializing Google Fit', error);
    }
  };

  // Fetch health data
  const fetchData = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      // Get step count
      GoogleFit.getDailyStepCountSamples({
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
      })
        .then(results => {
          if (results.length > 0) {
            for (const source of results) {
              if (source.steps.length > 0) {
                let totalSteps = 0;
                for (const stepData of source.steps) {
                  totalSteps += stepData.value;
                }
                setSteps(totalSteps);
                break;
              }
            }
          }
        })
        .catch(error => {
          console.log('Error fetching step count', error);
        });
        
      // Get heart rate data (last reading)
      GoogleFit.getHeartRateSamples({
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        bucketInterval: 1,
        bucketUnit: 'DAY',
      })
        .then(results => {
          if (results.length > 0) {
            // Get the most recent heart rate reading
            const latestReading = results[results.length - 1];
            setHeartRate(latestReading.value.toString());
          }
        })
        .catch(error => {
          console.log('Error fetching heart rate', error);
        });
        
      // Get SpO2 data
      GoogleFit.getOxygenSaturationSamples({
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        bucketInterval: 1,
        bucketUnit: 'DAY',
      })
        .then(results => {
          if (results.length > 0) {
            // Get the most recent SpO2 reading
            const latestReading = results[results.length - 1];
            setSpo2(latestReading.value.toString());
          }
        })
        .catch(error => {
          console.log('Error fetching SpO2', error);
        });
        
      setLastSync(now.toLocaleTimeString());
    } catch (error) {
      console.log('Error fetching health data', error);
    }
  };

  // Initialize Google Fit when component mounts
  useEffect(() => {
    initGoogleFit();
    
    // Set up periodic sync
    const syncInterval = setInterval(() => {
      if (authorized) {
        fetchData();
      }
    }, 15 * 60 * 1000); // Sync every 15 minutes
    
    return () => {
      clearInterval(syncInterval);
      // Disconnect from Google Fit
      GoogleFit.disconnect();
    };
  }, [authorized]);

  return (
    <View className="flex-1 justify-start items-center bg-white p-4">
      <Text className="text-blue-600 font-bold text-xl mb-8 mt-8">Wearable Health Data</Text>
      
      <ScrollView className="w-full">
        {/* Status Section */}
        <View className="bg-gray-100 rounded-lg p-4 mb-4 w-full">
          <Text className="text-gray-500 text-sm">Last synced: {lastSync}</Text>
          <Text className="text-gray-500 text-sm">
            Status: {authorized ? 'Connected' : 'Not connected'}
          </Text>
        </View>
        
        {/* Health Data Cards */}
        <View className="flex-row justify-between mb-4">
          {/* Steps Card */}
          <View className="bg-blue-50 rounded-lg p-4 w-30 items-center flex-1 mr-2">
            <Text className="text-blue-500 font-semibold">Steps</Text>
            <Text className="text-blue-700 font-bold text-2xl">{steps}</Text>
          </View>
          
          {/* Heart Rate Card */}
          <View className="bg-red-50 rounded-lg p-4 w-30 items-center flex-1 mx-2">
            <Text className="text-red-500 font-semibold">Heart Rate</Text>
            <Text className="text-red-700 font-bold text-2xl">{heartRate}</Text>
            <Text className="text-red-400 text-xs">bpm</Text>
          </View>
          
          {/* SpO2 Card */}
          <View className="bg-purple-50 rounded-lg p-4 w-30 items-center flex-1 ml-2">
            <Text className="text-purple-500 font-semibold">SpO2</Text>
            <Text className="text-purple-700 font-bold text-2xl">{spo2}</Text>
            <Text className="text-purple-400 text-xs">%</Text>
          </View>
        </View>
        
        {/* Manual Sync Button */}
        <Button 
          title="Sync Now" 
          onPress={fetchData} 
          disabled={!authorized}
          color="#3b82f6"
        />
      </ScrollView>
    </View>
  );
}