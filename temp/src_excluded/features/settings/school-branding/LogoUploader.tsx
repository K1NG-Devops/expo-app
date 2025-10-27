import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface LogoUploaderProps {
  currentLogo?: string | null;
  onUpload: (logoUrl: string) => void;
}

export function LogoUploader({ currentLogo, onUpload }: LogoUploaderProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(currentLogo || null);

  const pickImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a logo.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for logos
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (_error) {
      console.error('Error picking image:', _error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadImage = async (uri: string) => {
    if (!profile?.preschool_id) {
      Alert.alert('Error', 'School information not found');
      return;
    }

    try {
      setUploading(true);

      // Create form data
      const formData = new FormData();
      const filename = `logo-${profile.preschool_id}-${Date.now()}.jpg`;
      
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: filename,
      } as any);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('school-assets')
        .upload(`logos/${filename}`, formData, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('school-assets')
        .getPublicUrl(data.path);

      setLogoUri(publicUrl);
      onUpload(publicUrl);
      
      Alert.alert('Success', 'Logo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading logo:', _error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove the current logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setLogoUri(null);
            onUpload('');
          },
        },
      ]
    );
  };

  return (
    <View className="space-y-4">
      <View className="flex-row items-center space-x-4">
        {/* Logo Preview */}
        <View className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 items-center justify-center">
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              className="w-full h-full rounded-lg"
              resizeMode="contain"
            />
          ) : (
            <View className="items-center">
              <Ionicons name="image-outline" size={24} color="#9CA3AF" />
              <Text className="text-xs text-gray-500 mt-1">No logo</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-1 space-y-2">
          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading}
            className="bg-blue-600 px-4 py-2 rounded-lg flex-row items-center justify-center space-x-2"
          >
            <Ionicons 
              name={uploading ? "cloud-upload-outline" : "camera-outline"} 
              size={16} 
              color="white" 
            />
            <Text className="text-white font-medium">
              {uploading ? 'Uploading...' : logoUri ? 'Change Logo' : 'Upload Logo'}
            </Text>
          </TouchableOpacity>

          {logoUri && (
            <TouchableOpacity
              onPress={removeLogo}
              className="bg-red-100 px-4 py-2 rounded-lg flex-row items-center justify-center space-x-2"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text className="text-red-500 font-medium">Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Guidelines */}
      <View className="bg-blue-50 p-3 rounded-lg">
        <Text className="text-blue-800 font-medium text-sm mb-1">Logo Guidelines:</Text>
        <Text className="text-blue-700 text-xs leading-relaxed">
          • Use a square image (1:1 aspect ratio) for best results{'\n'}
          • Recommended size: 512x512 pixels or larger{'\n'}
          • Supported formats: JPG, PNG{'\n'}
          • Keep file size under 2MB{'\n'}
          • Use high contrast for better visibility on invoices
        </Text>
      </View>
    </View>
  );
}