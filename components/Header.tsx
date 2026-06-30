import { StyleSheet, View } from 'react-native'
import React from 'react'
import Typo from './Typo'
import { HeaderProps } from '@/types'

const Header = ({title ="", leftIcon, rightIcon, style}: HeaderProps) => {
  return (
    <View style={[styles.container, style]}>
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      {
        title && (
            <Typo 
                size={22}
                fontWeight={600}
                style={{
                    textAlign: 'center',
                    flex: 1,
                }}
            >
                {title}
            </Typo>
        )
      }
      {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
    </View>
  );
};

export default Header

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        flexDirection: 'row',
    },

    leftIcon: {
        position: 'absolute',
        left: 0,
        zIndex: 10,
    },
    rightIcon: {
        position: 'absolute',
        right: 0,
        zIndex: 10,
    }
})