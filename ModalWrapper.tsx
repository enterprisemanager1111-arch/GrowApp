import React, { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";

type Props = {
    visible?: boolean;
    children: React.ReactNode;
};

export default function ModalWrapper({ visible = true, children }: Props) {
    const { width } = useWindowDimensions();
    const cardWidth = Math.min(480, Math.max(320, width));
    const cardAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0.35)).current;
    const heartsAnim = useRef(new Animated.Value(0)).current;
    const handleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        cardAnim.setValue(0);
        const showCard = Animated.timing(cardAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        });
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 0.62, duration: 2300, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0.35, duration: 2300, useNativeDriver: true }),
            ]),
        );
        const heartsDrift = Animated.loop(
            Animated.sequence([
                Animated.timing(heartsAnim, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(heartsAnim, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ]),
        );
        const handlePulse = Animated.loop(
            Animated.sequence([
                Animated.timing(handleAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
                Animated.timing(handleAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
            ]),
        );

        showCard.start();
        pulse.start();
        heartsDrift.start();
        handlePulse.start();
        return () => {
            pulse.stop();
            heartsDrift.stop();
            handlePulse.stop();
        };
    }, [cardAnim, glowAnim, handleAnim, heartsAnim, visible]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <Animated.View style={[styles.glowOne, { opacity: glowAnim }]} />
                <Animated.View style={[styles.glowTwo, { opacity: glowAnim }]} />

                <Animated.Image
                    source={require("./assets/hearts-background.png")}
                    style={[
                        styles.hearts,
                        {
                            transform: [{ translateY: heartsAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
                        },
                    ]}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.keyboardAvoid}
                >
                    <Animated.View
                        style={[
                            styles.modal,
                            {
                                width: cardWidth,
                                opacity: cardAnim,
                                transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
                            },
                        ]}
                    >
                        <Animated.View
                            style={[
                                styles.handle,
                                {
                                    opacity: handleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
                                    transform: [{ scaleX: handleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
                                },
                            ]}
                        />
                        {children}
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(8,10,25,0.82)",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    keyboardAvoid: {
        width: "100%",
        alignItems: "center",
    },
    glowOne: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: "#5a46ff",
        top: 40,
        left: 12,
    },
    glowTwo: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: "#2fd4ff",
        bottom: 70,
        right: 18,
    },
    hearts: {
        position: "absolute",
        width: "100%",
        height: "100%",
        resizeMode: "cover",
        opacity: 0.11,
    },
    modal: {
        backgroundColor: "rgba(255,255,255,0.96)",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 24,
        paddingHorizontal: 20,
        maxHeight: "94%",
    },
    handle: {
        width: 46,
        height: 5,
        borderRadius: 999,
        backgroundColor: "#cfd3ea",
        marginBottom: 12,
    },
});
