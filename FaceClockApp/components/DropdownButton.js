import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function DropdownButton({ 
  icon, 
  title, 
  options, 
  onSelect, 
  style,
  buttonStyle 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();

  // Main button always triggers the first/default option
  const handleMainButtonPress = () => {
    if (options.length > 0) {
      onSelect(options[0].value);
    }
  };

  // Separate dropdown button handler
  const handleDropdownPress = (e) => {
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleOptionSelect = (value) => {
    setIsOpen(false);
    onSelect(value);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Main Button Card */}
      <View style={[
        styles.mainButtonContainer,
        buttonStyle,
        { backgroundColor: theme.gridButton || '#374151' }
      ]}>
        {/* Main Action Button - Takes most of the space */}
        <TouchableOpacity
          style={styles.mainButton}
          onPress={handleMainButtonPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>{icon}</Text>
          <Text style={[styles.buttonText, { color: theme.gridButtonText || '#ffffff' }]}>
            {title}
          </Text>
        </TouchableOpacity>

        {/* Separate Dropdown Button - Only if multiple options */}
        {options.length > 1 && (
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={handleDropdownPress}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownIconContainer}>
              <Text style={[styles.dropdownIcon, { color: theme.gridButtonText || '#ffffff' }]}>
                ⋮
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.dropdownContainer, { backgroundColor: theme.card || '#ffffff' }]}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownOption,
                  index !== options.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border || '#e2e8f0' }
                ]}
                onPress={() => handleOptionSelect(option.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownOptionText, { color: theme.text || '#1a1a1a' }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: (width - 80) / 3,
    marginBottom: 16,
  },
  mainButtonContainer: {
    aspectRatio: 1,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  mainButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  buttonIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#ffffff',
    paddingHorizontal: 4,
  },
  dropdownButton: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
  },
  dropdownIconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  dropdownIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    transform: [{ rotate: '90deg' }],
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    minWidth: 220,
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dropdownOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dropdownOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
});

