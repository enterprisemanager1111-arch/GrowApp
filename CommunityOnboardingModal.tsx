import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    View,
    Text,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    ScrollView,
    TextInput,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';

const CATEGORIES = [
    'Arts & Design','Cooking & Food','Education','Fashion','Gaming & Esports','Health & Wellness',
    'Media & Entertainment','Memes','Music & Performing Arts','Pop Culture','Productivity',
    'Spirituality & Energy','Sports & Fitness','Tech & Innovation','Wellbeing & Growth',
];

export default function CommunityOnboardingModal() {
    const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [discordUsername, setDiscordUsername] = useState("");
    const [email, setEmail] = useState("");
    const [discordLoading, setDiscordLoading] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [apiLoading, setApiLoading] = useState(false);
    const [discordLink, setDiscordLink] = useState('');

    // Payment states
    const [stripeAccountId, setStripeAccountId] = useState("");
    const [paymentError, setPaymentError] = useState("");

    // Errors states
    const [discordError, setDiscordError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [focusedField, setFocusedField] = useState<null | 'discordUsername' | 'email' | 'stripeAccountId'>(null);
    const [databaseWarning, setDatabaseWarning] = useState("");

    // Helper function to validate email format
    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const { width, height } = useWindowDimensions();
    const isMobileLayout = width < 768;
    const modalWidth = Math.min(680, Math.max(520, width * 0.64));
    const mobileStepHeights: Record<number, number> = {
        0: 0.58,
        1: 0.78,
        2: 0.52,
        3: 0.46,
    };
    const desktopStepHeights: Record<number, number> = {
        0: 500,
        1: 560,
        2: 330,
        3: 320,
    };
    const mobileModalHeight = Math.min(
        height * 0.84,
        Math.max(360, height * (mobileStepHeights[step] ?? 0.56)),
    );
    const modalMinHeight = isMobileLayout
        ? undefined
        : desktopStepHeights[step] ?? 500;
    const modalMaxHeight = isMobileLayout ? height * 0.84 : height * 0.92;

    const cardAnim = useRef(new Animated.Value(0)).current;
    const popAnim = useRef(new Animated.Value(0.9)).current;
    const stepAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0.25)).current;
    const shimmerAnim = useRef(new Animated.Value(-140)).current;

    useEffect(() => {
        cardAnim.setValue(0);
        popAnim.setValue(0.9);

        Animated.parallel([
            Animated.timing(cardAnim, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(popAnim, {
                toValue: 1,
                friction: 5,
                tension: 95,
                useNativeDriver: true,
            }),
        ]).start();
    }, [cardAnim, popAnim]);

    useEffect(() => {
        stepAnim.setValue(0);
        Animated.timing(stepAnim, {
            toValue: 1,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [step, stepAnim]);

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: (step + 1) / 4,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [progressAnim, step]);

    useEffect(() => {
        shimmerAnim.setValue(-140);
        Animated.timing(shimmerAnim, {
            toValue: 640,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [shimmerAnim, step]);

    // Validate Discord username via backend
    const validateDiscordUsername = async () => {
        if (!discordUsername.trim()) {
            setDiscordError("Discord username is required.");
            return false;
        }

        setDiscordLoading(true);
        try {
            const response = await fetch("http://localhost:3001/validate_discord_user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: discordUsername }),
            });

            const data = await response.json();
            if (!response.ok) {
                switch (data.error) {
                    case "already_member":
                        setDiscordError("This Discord username is already in the server.");
                        break;
                    case "missing_username":
                        setDiscordError("Discord username is required.");
                        break;
                    default:
                        setDiscordError("Please contact WeAreOneWithNature@proton.me");
                }
                return false;
            }

            setDiscordError("");
            return true;
        } catch (err) {
            console.error(err);
            setDiscordError("Please contact WeAreOneWithNature@proton.me");
            return false;
        } finally {
            setDiscordLoading(false);
        }
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (!text) {
            setEmailError("");
            return;
        }
        if (!isValidEmail(text)) {
            setEmailError("Email is not valid.");
            return;
        }
        setEmailError("");
    };

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    // Step 2 - Stripe payment
    const handlePaymentSubmit = async () => {
        if (!stripeAccountId.trim()) return;

        setApiLoading(true);
        setPaymentError("");
        setDatabaseWarning("");

        try {
            const response = await fetch("http://localhost:3001/connectPayment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stripeAccountId,
                    discordUsername
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setPaymentError(data.error || "Payment or account verification failed.");
            } else {
                if (data?.databaseAdded === false && data?.warning) {
                    setDatabaseWarning(data.warning);
                }

                try {
                    const inviteResponse = await fetch('http://localhost:3001/discord_invite');
                    const inviteData = await inviteResponse.json();
                    if (inviteData.discordInvite) {
                        setDiscordLink(inviteData.discordInvite);
                    } else {
                        setDiscordLink('Invite link will be shared shortly via email.');
                    }
                } catch (inviteErr) {
                    console.error(inviteErr);
                    setDiscordLink('Invite link will be shared shortly via email.');
                }
                setStep(3); // move to Discord link step
            }
        } catch (err) {
            console.error(err);
            setPaymentError("Network or server error.");
        } finally {
            setApiLoading(false);
        }
    };

    return (
        <Modal visible transparent animationType="fade">
            <View style={[styles.overlay, !isMobileLayout && styles.overlayDesktop]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={[styles.keyboardAvoid, isMobileLayout && styles.keyboardAvoidMobile]}
                >
                    <Animated.View
                        style={[
                            styles.modal,
                            isMobileLayout && styles.modalMobile,
                            !isMobileLayout && styles.modalDesktop,
                            {
                                width: isMobileLayout ? undefined : modalWidth,
                                height: isMobileLayout ? mobileModalHeight : undefined,
                                minHeight: modalMinHeight,
                                maxHeight: modalMaxHeight,
                                opacity: cardAnim,
                                transform: [
                                    { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                                    { scale: popAnim },
                                ],
                            },
                        ]}
                    >
                        {isMobileLayout ? <View style={styles.handle} /> : null}
                        <Text style={styles.brand}>GROW</Text>
                        <Text style={styles.stepLabel}>Step {Math.min(step + 1, 4)} of 4</Text>
                        <View style={styles.progressTrack}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: progressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%'],
                                        }),
                                    },
                                ]}
                            />
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.progressShimmer,
                                    {
                                        transform: [{ translateX: shimmerAnim }],
                                    },
                                ]}
                            />
                        </View>

                        <Animated.View
                            style={{
                                width: '100%',
                                flex: 1,
                                minHeight: 0,
                                opacity: stepAnim,
                                transform: [{ translateY: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                            }}
                        >
                        {/* STEP 0 — TERMS OF SERVICE */}
                        {step === 0 && (
                            <ScrollView
                                style={styles.stepScroll}
                                contentContainerStyle={styles.stepScrollContent}
                                horizontal={false}
                                showsVerticalScrollIndicator
                                showsHorizontalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <Text style={styles.title}>Welcome to a better community experience</Text>
                                <Text style={styles.subtitle}>Simple onboarding with clear rules.</Text>
                                <ScrollView
                                    style={[styles.termsBox, isMobileLayout && styles.termsBoxMobile, !isMobileLayout && styles.termsBoxDesktop]}
                                    horizontal={false}
                                    showsVerticalScrollIndicator
                                    showsHorizontalScrollIndicator={false}
                                    persistentScrollbar
                                    nestedScrollEnabled
                                >
                                    <Text style={styles.termsText}>
                                        GROW is a community platform designed to help people find meaningful
                                        connection through shared interests and hobbies. By joining, you gain access
                                        to a Discord community where members post about what they care about,
                                        support each other, and build relationships around common passions.

                                        {"\n\n"}
                                        A one-time payment of $3 USD grants access to the GrowApp community.
                                        When new members join, revenue from new purchases is distributed among
                                        existing Discord community members according to internal community rules.

                                        {"\n\n"}
                                        Server administrators aim to provide discretionary monthly community
                                        support payments to active members, even during periods when no new users
                                        join. These payments are not guaranteed and are provided at the discretion
                                        of the administrators based on community participation and sustainability.

                                        {"\n\n"}
                                        GrowApp is not an investment opportunity and does not guarantee earnings.
                                        The primary purpose of the platform is community participation, connection,
                                        and shared growth.

                                        {"\n\n"}
                                        By continuing, you agree to participate respectfully, follow community
                                        guidelines, and understand that access may be revoked for violations
                                        of community standards.
                                    </Text>
                                </ScrollView>

                                <Pressable
                                    style={styles.checkboxRow}
                                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                                >
                                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                                        {acceptedTerms ? <Text style={styles.checkboxIcon}>✓</Text> : null}
                                    </View>
                                    <Text style={styles.checkboxText}>
                                        I have read and agree to the Terms of Service
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => ([
                                        styles.continueButton,
                                        acceptedTerms ? styles.continueActive : styles.continueDisabled,
                                        pressed && styles.buttonPressed,
                                    ])}
                                    disabled={!acceptedTerms}
                                    onPress={() => setStep(1)}
                                >
                                    <Text style={styles.continueText}>Continue</Text>
                                </Pressable>
                            </ScrollView>
                        )}

                        {/* STEP 1 — Discord username */}
                        {step === 1 && (
                            <ScrollView
                                style={styles.stepScroll}
                                contentContainerStyle={styles.stepScrollContent}
                                horizontal={false}
                                showsVerticalScrollIndicator
                                showsHorizontalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <Text style={styles.title}>Connect your profile</Text>
                                <Text style={styles.requiredLegend}>* required</Text>
                                <Text style={styles.inputLabel}>
                                    Discord username <Text style={styles.requiredStar}>*</Text>
                                </Text>

                                <TextInput
                                    style={[styles.input, focusedField === 'discordUsername' && styles.inputFocused]}
                                    placeholder="e.g. grow.member"
                                    placeholderTextColor="#79a49c"
                                    value={discordUsername}
                                    onChangeText={setDiscordUsername}
                                    autoCapitalize="none"
                                    onFocus={() => setFocusedField('discordUsername')}
                                    onBlur={async () => {
                                        setFocusedField(null);
                                        await validateDiscordUsername();
                                    }}
                                />
                                {discordError ? <Text style={styles.errorText}>{discordError}</Text> : null}

                                <Text style={styles.inputLabel}>Email</Text>
                                <TextInput
                                    style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                                    placeholder="you@example.com"
                                    placeholderTextColor="#79a49c"
                                    value={email}
                                    onChangeText={handleEmailChange}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => {
                                        setFocusedField(null);
                                        if (email && !isValidEmail(email)) setEmailError("Email is not valid.");
                                        else setEmailError("");
                                    }}
                                />
                                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                                <Text style={styles.inputLabel}>Interests (optional)</Text>
                                <View style={styles.chipsWrap}>
                                    {CATEGORIES.map((category) => (
                                        <Pressable
                                            key={category}
                                            onPress={() => toggleCategory(category)}
                                            style={[
                                                styles.chip,
                                                selectedCategories.includes(category) && styles.chipActive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.chipText,
                                                    selectedCategories.includes(category) && styles.chipTextActive,
                                                ]}
                                            >
                                                {category}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Pressable
                                    style={({ pressed }) => ([
                                        styles.continueButton,
                                        discordLoading || !discordUsername || !!discordError
                                            ? styles.continueDisabled
                                            : styles.continueActive,
                                        pressed && styles.buttonPressed,
                                    ])}
                                    disabled={discordLoading || !discordUsername || !!discordError}
                                    onPress={async () => {
                                        const isValid = await validateDiscordUsername();
                                        if (!isValid) return;
                                        setStep(2);
                                    }}
                                >
                                    {discordLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.continueText}>Continue</Text>}
                                </Pressable>
                            </ScrollView>
                        )}

                        {/* STEP 2 — Stripe payment */}
                        {step === 2 && (
                            <ScrollView
                                style={styles.stepScroll}
                                contentContainerStyle={styles.stepScrollContent}
                                horizontal={false}
                                showsVerticalScrollIndicator
                                showsHorizontalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <Text style={styles.title}>Finish setup</Text>
                                <Text style={styles.subtitle}>
                                    Add your Stripe Account ID to process your one-time $3 entry payment.
                                </Text>

                                <TextInput
                                    style={[styles.input, focusedField === 'stripeAccountId' && styles.inputFocused]}
                                    placeholder="acct_..."
                                    placeholderTextColor="#79a49c"
                                    value={stripeAccountId}
                                    onChangeText={text => { setStripeAccountId(text); setPaymentError(""); }}
                                    autoCapitalize="none"
                                    onFocus={() => setFocusedField('stripeAccountId')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {paymentError ? <Text style={styles.errorText}>{paymentError}</Text> : null}

                                <Pressable
                                    style={({ pressed }) => ([
                                        styles.continueButton,
                                        stripeAccountId.trim() && !apiLoading ? styles.continueActive : styles.continueDisabled,
                                        pressed && styles.buttonPressed,
                                    ])}
                                    disabled={!stripeAccountId.trim() || apiLoading}
                                    onPress={handlePaymentSubmit}
                                >
                                    {apiLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.continueText}>Submit</Text>}
                                </Pressable>

                                <Pressable onPress={() => setStep(1)}>
                                    <Text style={styles.backText}>Back</Text>
                                </Pressable>
                            </ScrollView>
                        )}

                        {/* STEP 3 — Discord link */}
                        {step === 3 && (
                            <ScrollView
                                style={styles.stepScroll}
                                contentContainerStyle={styles.stepScrollContent}
                                horizontal={false}
                                showsVerticalScrollIndicator
                                showsHorizontalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                {databaseWarning ? (
                                    <Text style={styles.warningText}>
                                        {databaseWarning}
                                    </Text>
                                ) : null}
                                <Text style={styles.title}>You are in ✨</Text>
                                <Text style={styles.subtitle}>
                                    Use the invite link below to join now, or check your email.
                                </Text>
                                <TextInput
                                    style={styles.linkBox}
                                    value={discordLink}
                                    editable={false}
                                    selectTextOnFocus
                                />
                            </ScrollView>
                        )}
                        </Animated.View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 10, 16, 0.42)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
    },
    overlayDesktop: {
        justifyContent: 'center',
    },
    keyboardAvoid: {
        width: '100%',
        alignItems: 'center',
        overflow: 'hidden',
    },
    keyboardAvoidMobile: {
        flex: 1,
        alignItems: 'stretch',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: 'rgba(7, 26, 34, 0.86)',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 1,
        borderColor: 'rgba(25, 196, 161, 0.52)',
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 32,
        paddingHorizontal: 22,
        maxHeight: '94%',
        overflow: 'hidden',
        shadowColor: '#20d7b2',
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
        elevation: 12,
    },
    modalMobile: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        alignSelf: 'stretch',
        width: '100%',
        maxWidth: '100%',
        paddingBottom: 8,
    },
    modalDesktop: {
        borderRadius: 0,
        maxHeight: '92%',
        paddingHorizontal: 28,
        borderColor: 'rgba(25, 196, 161, 0.6)',
    },
    panelGlowTop: {
        position: 'absolute',
        top: -1,
        left: '18%',
        right: '18%',
        height: 2,
        backgroundColor: '#2ef4c8',
        shadowColor: '#2ef4c8',
        shadowOpacity: 0.75,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 0 },
    },
    panelGlowBottom: {
        position: 'absolute',
        bottom: -1,
        left: '20%',
        right: '20%',
        height: 2,
        backgroundColor: '#2ef4c8',
        shadowColor: '#2ef4c8',
        shadowOpacity: 0.65,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 0 },
    },
    panelTopNotchLeft: {
        position: 'absolute',
        top: -1,
        left: '32%',
        width: 16,
        height: 8,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#1fd9b6',
        transform: [{ skewX: '-35deg' }],
    },
    panelTopNotchRight: {
        position: 'absolute',
        top: -1,
        right: '32%',
        width: 16,
        height: 8,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderColor: '#1fd9b6',
        transform: [{ skewX: '35deg' }],
    },
    handle: {
        width: 46,
        height: 5,
        borderRadius: 999,
        backgroundColor: 'rgba(34, 205, 174, 0.52)',
        marginBottom: 10,
    },
    brand: {
        color: '#39ebc1',
        letterSpacing: 2,
        fontWeight: '800',
        fontSize: 16,
        marginBottom: 6,
    },
    stepLabel: {
        color: '#8ec8bb',
        fontSize: 12,
        marginBottom: 8,
        fontWeight: '600',
    },
    progressTrack: {
        width: '100%',
        height: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(96, 145, 142, 0.28)',
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: '#1dd0aa',
    },
    progressShimmer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 90,
        borderRadius: 999,
        backgroundColor: 'rgba(176, 255, 237, 0.25)',
    },
    termsBox: {
        width: '100%',
        maxHeight: 220,
        borderWidth: 1,
        borderColor: 'rgba(95, 150, 143, 0.45)',
        borderRadius: 0,
        padding: 14,
        marginBottom: 14,
        backgroundColor: 'rgba(9, 36, 45, 0.5)',
        outlineStyle: 'none' as any,
    },
    termsBoxMobile: {
        maxHeight: 170,
    },
    termsBoxDesktop: {
        maxHeight: 220,
    },
    termsText: { fontSize: 14.5, lineHeight: 22, color: '#d0eae4' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, width: '100%', outlineStyle: 'none' as any },
    checkbox: { width: 20, height: 20, borderWidth: 1.6, borderColor: '#38a995', marginRight: 10, borderRadius: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7, 28, 33, 0.9)' },
    checkboxChecked: { backgroundColor: '#18bf9e', borderColor: '#18bf9e' },
    checkboxIcon: { color: '#04221d', fontWeight: '800', fontSize: 12, lineHeight: 13 },
    checkboxText: { fontSize: 14, color: '#c7e9e2', flex: 1 },
    input: {
        width: '100%',
        minHeight: 48,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(81, 147, 140, 0.55)',
        borderRadius: 0,
        marginBottom: 6,
        fontSize: 16,
        color: '#e6fff9',
        backgroundColor: 'rgba(6, 28, 35, 0.58)',
        outlineStyle: 'none' as any,
    },
    inputFocused: {
        borderColor: '#58f6c8',
        shadowColor: '#58f6c8',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 2,
    },
    inputLabel: {
        alignSelf: 'flex-start',
        marginBottom: 5,
        marginTop: 8,
        color: '#97cdc1',
        fontWeight: '600',
    },
    errorText: { color: '#ff6e86', marginBottom: 8, alignSelf: 'flex-start', fontSize: 12.5 },
    warningText: { color: '#ff4a4a', marginBottom: 10, textAlign: 'center', fontSize: 13.5, fontWeight: '700' },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', marginTop: 3, marginBottom: 10 },
    chip: {
        borderWidth: 1,
        borderColor: 'rgba(78, 136, 130, 0.65)',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(5, 30, 35, 0.42)',
    },
    chipActive: {
        borderColor: '#21d0ad',
        backgroundColor: 'rgba(18, 151, 125, 0.28)',
    },
    chipText: { fontSize: 12.5, color: '#b8ddd5', fontWeight: '500' },
    chipTextActive: { color: '#86f0d7' },
    continueButton: { minHeight: 50, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 0, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 2, width: '100%', borderWidth: 1, borderColor: 'rgba(120, 255, 220, 0.28)' },
    buttonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
    continueDisabled: { backgroundColor: '#2f4e53', opacity: 0.55 },
    continueActive: { backgroundColor: '#0aa676' },
    continueText: { color: '#f4fffc', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center', color: '#f2fffb' },
    subtitle: { fontSize: 15, marginBottom: 12, textAlign: 'center', color: '#8bc5b8' },
    linkBox: {
        width: '100%',
        padding: 13,
        borderWidth: 1,
        borderColor: 'rgba(81, 147, 140, 0.55)',
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 14,
        marginTop: 10,
        backgroundColor: 'rgba(6, 28, 35, 0.58)',
        color: '#dff8f2',
    },
    backText: { marginTop: 16, color: '#84c8ba', textAlign: 'center', fontWeight: '600' },
    requiredStar: { color: "red", fontWeight: "700" },
    requiredLegend: { alignSelf: "flex-start", marginBottom: 8, fontSize: 12, color: "#89bdb1" },
    stepScroll: { width: '100%', alignSelf: 'stretch', flex: 1, minHeight: 0 },
    stepScrollContent: { paddingBottom: 8, flexGrow: 1 },
});

