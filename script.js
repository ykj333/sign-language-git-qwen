// 손으로 말해요 - 유아 수화 놀이 앱

class SignLanguageApp {
    constructor() {
        this.currentGame = 'gesture';
        this.isRecording = false;
        this.recognition = null;
        this.celebrationItems = [];
        this.stickers = parseInt(localStorage.getItem('signStars') || '0', 10);
        this.sentenceLevel = 0; // 쉬운 문장부터 순차 진행
        this.totalGamesPlayed = 0;
        this.soundEnabled = true;
        this.currentDifficulty = 'easy';
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // 마스코트 메시지
        this.mascotMessages = [
            '잘했어요!',
            '화이팅!',
            '너무 귀여워요!',
            '한 번 더 해봐요!',
            '즐거워요!',
            '최고예요!'
        ];

        // 수화 단어 데이터: 단계별 동작 카드 + 손모양(hand) + 움직임(motion)
        this.signPhrases = [
            {
                text: '사랑해요', emoji: '❤️', voice: '사랑해요',
                hand: 'open', motion: 'heart',
                steps: [
                    { icon: '🖐️', text: '손을 펴요' },
                    { icon: '💗', text: '가슴에 대요' },
                    { icon: '🔄', text: '빙글빙글 돌려요' }
                ]
            },
            {
                text: '안녕', emoji: '👋', voice: '안녕',
                hand: 'open', motion: 'wave',
                steps: [
                    { icon: '🖐️', text: '손을 들어요' },
                    { icon: '↔️', text: '흔들 흔들어요' }
                ]
            },
            {
                text: '고마워요', emoji: '🙏', voice: '고마워요',
                hand: 'together', motion: 'bow',
                steps: [
                    { icon: '🤲', text: '손을 모아요' },
                    { icon: '🙇', text: '살짝 숙여요' }
                ]
            },
            {
                text: '좋아요', emoji: '👍', voice: '좋아요',
                hand: 'thumbsup', motion: 'up',
                steps: [
                    { icon: '✊', text: '주먹을 쥐어요' },
                    { icon: '👍', text: '엄지 척!' }
                ]
            },
            {
                text: '냠냠', emoji: '🍎', voice: '냠냠 먹어요',
                hand: 'flat', motion: 'eat',
                steps: [
                    { icon: '🖐️', text: '손을 오므려요' },
                    { icon: '😋', text: '입에 쏙!' }
                ]
            },
            {
                text: '가요', emoji: '🚶', voice: '가요',
                hand: 'point', motion: 'forward',
                steps: [
                    { icon: '☝️', text: '손가락을 펴요' },
                    { icon: '➡️', text: '앞으로 쭉!' }
                ]
            }
        ];

        // 문장놀이: 자연스러운 유아 문장, 쉬운 것(2단어)부터 순서대로
        this.signSentences = [
            { signs: ['친구야', '안녕'], emojis: ['🧒', '👋'], correct: '친구야 안녕' },
            { signs: ['선생님', '고마워요'], emojis: ['👩‍🏫', '🙏'], correct: '선생님 고마워요' },
            { signs: ['밥을', '먹어요'], emojis: ['🍚', '😋'], correct: '밥을 먹어요' },
            { signs: ['공원에', '가요'], emojis: ['🛝', '🚶'], correct: '공원에 가요' },
            { signs: ['나는', '가족을', '사랑해요'], emojis: ['🧒', '👨‍👩‍👧', '❤️'], correct: '나는 가족을 사랑해요' }
        ];

        // 게임 전환 시 음성 안내
        this.gameIntros = {
            'gesture': '손을 따라 해봐요!',
            'voice-follow': '소리를 듣고 같은 카드를 골라봐요!',
            'sentence': '카드를 눌러 문장을 만들어봐요!',
            'voice-impl': '소리에 맞춰 함께 해봐요!'
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupVoiceRecognition();
        this.updateStickerBar();
        this.loadGestureGame();
        this.startParticles();
    }

    setupEventListeners() {
        // 게임 네비게이션 버튼
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const game = e.currentTarget.dataset.game;
                this.switchGame(game);
            });
        });

        // 난이도 선택 버튼
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.dataset.diff;
                this.setDifficulty(difficulty);
            });
        });

        // 게임별 액션 버튼
        document.getElementById('follow-gesture')?.addEventListener('click', () => {
            this.startGestureFollow();
        });

        document.getElementById('voice-follow-record')?.addEventListener('click', () => {
            this.toggleVoiceFollowRecording();
        });

        document.getElementById('check-sentence')?.addEventListener('click', () => {
            this.checkSignSentence();
        });

        document.getElementById('follow-voice-impl')?.addEventListener('click', () => {
            this.startVoiceImplFollow();
        });

        // 마스코트 클릭
        const mascot = document.getElementById('mascot');
        if (mascot) {
            mascot.addEventListener('click', () => {
                const randomMsg = this.mascotMessages[Math.floor(Math.random() * this.mascotMessages.length)];
                this.showMascotBubble(randomMsg);
                if (this.soundEnabled) {
                    this.speak(randomMsg);
                }
            });
            
            mascot.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    mascot.click();
                }
            });
        }

        // 음성 토글 버튼
        document.getElementById('sound-toggle')?.addEventListener('click', () => {
            this.toggleSound();
        });

        // 진행 상황 초기화 버튼
        document.getElementById('reset-progress')?.addEventListener('click', () => {
            this.resetProgress();
        });
    }

    switchGame(game) {
        this.currentGame = game;

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.game === game);
        });

        document.querySelectorAll('.game-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${game}-game`).classList.add('active');

        // 음성 안내 후 게임 로드 (로드 함수 내 단어 발음은 대기열에 추가)
        this.speak(this.gameIntros[game] || '');

        switch (game) {
            case 'gesture':
                this.loadGestureGame(true);
                break;
            case 'voice-follow':
                this.loadVoiceFollowGame(true);
                break;
            case 'sentence':
                this.loadSignSentenceGame(true);
                break;
            case 'voice-impl':
                this.loadVoiceImplGame(true);
                break;
        }
    }

    /* ---------- 공통 유틸 ---------- */

    pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    speak(text, queue = false) {
        if (!text || !('speechSynthesis' in window)) return;
        if (!queue) speechSynthesis.cancel(); // 이전 발화 중단 후 새로 시작
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.8;  // 유아가 듣기 편한 느린 속도
        utterance.pitch = 1.2; // 밝은 톤
        speechSynthesis.speak(utterance);
    }

    setFeedback(id, message, type) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = message;
        el.className = `feedback ${type}`;
    }

    addSticker() {
        this.stickers += 1;
        localStorage.setItem('signStars', String(this.stickers));
        this.updateStickerBar();
        this.mascotReact('happy');
    }

    updateStickerBar() {
        const el = document.getElementById('sticker-count');
        if (el) el.textContent = `⭐ ${this.stickers}`;
    }

    mascotReact(type) {
        const mascot = document.getElementById('mascot');
        if (!mascot) return;
        mascot.classList.remove('happy', 'encourage');
        void mascot.offsetWidth; // 애니메이션 재시작
        mascot.classList.add(type);
        setTimeout(() => mascot.classList.remove(type), 1600);
    }

    /* ---------- 손 그림 SVG ---------- */

    getHandSVG(hand, motion) {
        const bodies = {
            open: `
                <ellipse cx="40" cy="82" rx="12" ry="20" transform="rotate(-35 40 82)"/>
                <rect x="44" y="54" width="58" height="62" rx="26"/>
                <rect x="48" y="18" width="12" height="44" rx="6"/>
                <rect x="63" y="12" width="12" height="50" rx="6"/>
                <rect x="78" y="15" width="12" height="47" rx="6"/>
                <rect x="93" y="22" width="12" height="40" rx="6"/>`,
            flat: `
                <ellipse cx="42" cy="70" rx="10" ry="16" transform="rotate(-40 42 70)"/>
                <rect x="40" y="58" width="72" height="48" rx="22"/>
                <rect x="104" y="61" width="34" height="11" rx="5.5"/>
                <rect x="104" y="76" width="34" height="11" rx="5.5"/>
                <rect x="104" y="91" width="30" height="11" rx="5.5"/>`,
            thumbsup: `
                <rect x="48" y="58" width="58" height="56" rx="24"/>
                <rect x="66" y="16" width="18" height="48" rx="9"/>
                <ellipse cx="52" cy="72" rx="10" ry="16" transform="rotate(-30 52 72)"/>`,
            point: `
                <ellipse cx="44" cy="74" rx="10" ry="16" transform="rotate(-35 44 74)"/>
                <rect x="42" y="54" width="58" height="60" rx="26"/>
                <rect x="94" y="66" width="48" height="16" rx="8"/>`,
            together: `
                <g transform="rotate(-12 52 80)">
                    <rect x="30" y="52" width="44" height="60" rx="20"/>
                    <rect x="34" y="26" width="9" height="32" rx="4.5"/>
                    <rect x="46" y="22" width="9" height="36" rx="4.5"/>
                    <rect x="58" y="24" width="9" height="34" rx="4.5"/>
                </g>
                <g transform="rotate(12 118 80)">
                    <rect x="96" y="52" width="44" height="60" rx="20"/>
                    <rect x="100" y="26" width="9" height="32" rx="4.5"/>
                    <rect x="112" y="22" width="9" height="36" rx="4.5"/>
                    <rect x="124" y="24" width="9" height="34" rx="4.5"/>
                </g>`
        };

        const arrows = {
            wave: '<path class="motion-arrow" d="M25 45 Q75 12 125 45"/>',
            heart: '<path class="motion-arrow" d="M128 55 a26 26 0 1 1 -4 18"/>',
            bow: '<path class="motion-arrow" d="M88 18 Q88 40 88 52"/>',
            up: '<path class="motion-arrow" d="M135 95 L135 35"/>',
            eat: '<path class="motion-arrow" d="M142 78 L168 78"/>',
            forward: '<path class="motion-arrow" d="M122 74 L168 74"/>'
        };

        const markerId = `arrowhead-${motion}`;
        return `
        <svg class="sign-svg motion-${motion}" viewBox="0 0 180 140" role="img" aria-label="수화 동작 그림">
            <defs>
                <marker id="${markerId}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0 0 L6 3 L0 6 Z" class="arrowhead"/>
                </marker>
            </defs>
            <g class="svg-hand">${bodies[hand] || bodies.open}</g>
            ${(arrows[motion] || '').replace('class="motion-arrow"', `class="motion-arrow" marker-end="url(#${markerId})"`)}
        </svg>`;
    }

    /* ---------- 1. 수화 몸짓 따라하기 ---------- */

    loadGestureGame(queueVoice = false) {
        const phrase = this.pickRandom(this.signPhrases);
        this.currentGesturePhrase = phrase;

        document.getElementById('gesture-phrase').innerHTML =
            `<h3>${phrase.emoji} ${phrase.text}</h3>`;

        // 단계별 동작 카드
        const stepsEl = document.getElementById('gesture-steps');
        stepsEl.innerHTML = phrase.steps.map((step, i) => `
            <div class="step-card">
                <span class="step-num">${i + 1}</span>
                <span class="step-icon">${step.icon}</span>
                <span class="step-text">${step.text}</span>
            </div>`).join('');

        document.getElementById('gesture-animation').innerHTML =
            this.getHandSVG(phrase.hand, phrase.motion);

        this.speak(phrase.voice, queueVoice);
    }

    startGestureFollow() {
        const anim = document.getElementById('gesture-animation');
        anim.classList.add('animate');
        this.showSuccessFlash();
        this.showCelebration(window.innerWidth / 2, window.innerHeight / 2);
        this.addSticker();
        this.speak('잘했어요!');
        setTimeout(() => {
            anim.classList.remove('animate');
            this.loadGestureGame();
        }, 2500);
    }

    /* ---------- 2. 수화 음성 따라하기 ---------- */

    loadVoiceFollowGame(queueVoice = false) {
        const phrase = this.pickRandom(this.signPhrases);
        this.currentVoiceFollowPhrase = phrase;

        document.getElementById('voice-follow-phrase').innerHTML =
            `<h3>🔊 무슨 말일까요?</h3>`;

        // 4개 선택 카드 생성 (이모지 + 글자)
        const options = [phrase];
        while (options.length < 4 && options.length < this.signPhrases.length) {
            const rand = this.pickRandom(this.signPhrases);
            if (!options.includes(rand)) options.push(rand);
        }
        this.shuffle(options);

        const container = document.getElementById('voice-follow-options');
        container.innerHTML = '';
        options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'voice-option-btn';
            button.innerHTML = `<span class="option-emoji">${option.emoji}</span><span class="option-text">${option.text}</span>`;
            button.addEventListener('click', () => this.checkVoiceFollow(option, phrase, button));
            container.appendChild(button);
        });

        this.setFeedback('voice-follow-feedback', '소리를 듣고 같은 카드를 눌러요!', 'hint');
        setTimeout(() => this.speak(phrase.voice, queueVoice), queueVoice ? 0 : 500);
    }

    checkVoiceFollow(selected, correct, button) {
        const buttons = document.querySelectorAll('.voice-option-btn');

        if (selected === correct) {
            button.classList.add('correct');
            this.showStars(button);
            this.addSticker();
            this.setFeedback('voice-follow-feedback', '정답! 잘했어요! 🎉', 'success');
            this.speak('정답! 잘했어요!');
            buttons.forEach(btn => btn.disabled = true);
            setTimeout(() => this.loadVoiceFollowGame(), 2200);
        } else {
            // 유아용 긍정 피드백: 빨간 오답 대신 부드러운 재시도
            button.classList.add('retry');
            this.mascotReact('encourage');
            this.setFeedback('voice-follow-feedback', '괜찮아요, 한 번 더 해봐요! 💪', 'retry');
            this.speak('한 번 더 해봐요!');
            setTimeout(() => button.classList.remove('retry'), 700);
        }
    }

    toggleVoiceFollowRecording() {
        if (!this.recognition) {
            this.setFeedback('voice-follow-feedback', '이 브라우저는 음성 인식을 지원하지 않아요.', 'retry');
            return;
        }
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    /* ---------- 3. 문장놀이 ---------- */

    loadSignSentenceGame(queueVoice = false) {
        const data = this.signSentences[this.sentenceLevel % this.signSentences.length];
        this.currentSignSentence = data;

        // 빈칸 수 = 단어 수 (클릭하면 되돌리기 가능)
        const display = document.getElementById('sentence-display');
        display.innerHTML = '';
        data.signs.forEach((_, index) => {
            const blank = document.createElement('button');
            blank.className = 'sentence-blank';
            blank.textContent = '?';
            blank.dataset.index = index;
            blank.dataset.sign = '';
            blank.addEventListener('click', () => this.removeSignFromBlank(blank));
            display.appendChild(blank);
        });

        // 수화 카드 선택지
        const bank = document.getElementById('sign-bank');
        bank.innerHTML = '';
        data.signs.forEach((sign, i) => {
            const button = document.createElement('button');
            button.className = 'sign-bank-btn';
            button.innerHTML = `<span class="sign-icon">${data.emojis[i]}</span> ${sign}`;
            button.dataset.sign = sign;
            button.addEventListener('click', () => this.placeSignInSentence(sign, data.emojis[i], button));
            bank.appendChild(button);
        });

        document.getElementById('check-sentence').style.display = 'none';
        this.setFeedback('sentence-feedback', '카드를 눌러 문장을 만들어요!', 'hint');
        this.speak(data.correct, queueVoice);
    }

    placeSignInSentence(sign, emoji, button) {
        const blanks = Array.from(document.querySelectorAll('.sentence-blank'));
        const empty = blanks.find(b => b.dataset.sign === '');
        if (!empty) return;

        empty.dataset.sign = sign;
        empty.innerHTML = `${emoji} ${sign}`;
        empty.classList.add('filled');
        button.style.display = 'none';

        if (blanks.every(b => b.dataset.sign !== '')) {
            document.getElementById('check-sentence').style.display = 'inline-block';
        }
    }

    removeSignFromBlank(blank) {
        if (blank.dataset.sign === '') return;
        const sign = blank.dataset.sign;
        blank.dataset.sign = '';
        blank.textContent = '?';
        blank.classList.remove('filled');

        document.querySelectorAll('.sign-bank-btn').forEach(btn => {
            if (btn.dataset.sign === sign) btn.style.display = 'flex';
        });
        document.getElementById('check-sentence').style.display = 'none';
    }

    checkSignSentence() {
        const blanks = Array.from(document.querySelectorAll('.sentence-blank'));
        const userSentence = blanks.map(b => b.dataset.sign).join(' ');

        if (userSentence === this.currentSignSentence.correct) {
            this.setFeedback('sentence-feedback', '와! 문장 완성! 🎉', 'success');
            this.showSuccessFlash();
            this.showCelebration(window.innerWidth / 2, window.innerHeight / 2);
            this.addSticker();
            this.speak('와! 잘했어요!');
            this.sentenceLevel += 1; // 다음 단계 문장으로
            setTimeout(() => this.loadSignSentenceGame(), 2200);
        } else {
            this.mascotReact('encourage');
            this.setFeedback('sentence-feedback', '순서가 조금 달라요. 카드를 눌러 고쳐봐요!', 'retry');
            this.speak('한 번 더 해봐요!');
        }
    }

    /* ---------- 4. 음성 구현 따라하기 ---------- */

    loadVoiceImplGame(queueVoice = false) {
        const phrase = this.pickRandom(this.signPhrases);
        this.currentVoiceImplPhrase = phrase;

        document.getElementById('voice-impl-phrase').innerHTML =
            `<h3>${phrase.emoji} ${phrase.text}</h3>`;

        document.getElementById('voice-impl-animation').innerHTML =
            this.getHandSVG(phrase.hand, phrase.motion);

        this.speak(phrase.voice, queueVoice);
    }

    startVoiceImplFollow() {
        const anim = document.getElementById('voice-impl-animation');
        anim.classList.add('animate-sync');
        this.setFeedback('voice-impl-feedback', '따라 따라 해봐요! 🎵', 'success');
        this.speak(this.currentVoiceImplPhrase.voice);
        this.addSticker();
        setTimeout(() => {
            anim.classList.remove('animate-sync');
            this.loadVoiceImplGame();
        }, 3500);
    }

    /* ---------- 음성 인식 ---------- */

    setupVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            console.log('Speech recognition not supported');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'ko-KR';

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.checkVoiceAnswer(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.setFeedback('voice-follow-feedback', '잘 못 들었어요. 다시 말해줄래요?', 'retry');
            this.stopRecording();
        };

        this.recognition.onend = () => {
            if (this.isRecording) this.stopRecording();
        };
    }

    startRecording() {
        this.isRecording = true;
        const recordBtn = document.getElementById('voice-follow-record');
        recordBtn.textContent = '🔴 듣는 중...';
        recordBtn.classList.add('recording');

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            this.stopRecording();
        }
    }

    stopRecording() {
        this.isRecording = false;
        const recordBtn = document.getElementById('voice-follow-record');
        if (recordBtn) {
            recordBtn.textContent = '🎤 말하기';
            recordBtn.classList.remove('recording');
        }
        if (this.recognition) {
            try { this.recognition.stop(); } catch (e) { /* 이미 정지된 경우 무시 */ }
        }
    }

    checkVoiceAnswer(transcript) {
        const correct = this.currentVoiceFollowPhrase;
        if (!correct) {
            this.stopRecording();
            return;
        }

        // 유아 발음 기준 완화된 유사도(0.4)
        if (transcript.includes(correct.text) || this.calculateSimilarity(transcript, correct.text) >= 0.4) {
            this.setFeedback('voice-follow-feedback', '잘했어요! 🎉', 'success');
            this.showSuccessFlash();
            this.addSticker();
            this.speak('잘했어요!');
        } else {
            this.mascotReact('encourage');
            this.setFeedback('voice-follow-feedback', '조금 더 크게 말해볼까요? 💪', 'retry');
            this.speak('한 번 더 해봐요!');
        }

        this.stopRecording();
    }

    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        if (str1.length === 0 || str2.length === 0) return 0;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        return (longer.length - this.levenshteinDistance(longer, shorter)) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /* ---------- 그래픽 효과 ---------- */

    startParticles() {
        if (this.reducedMotion) return; // 모션 민감 대응
        const container = document.getElementById('particles-container');

        setInterval(() => {
            // 개수 상한을 두어 과자극 방지
            if (container.childElementCount < 8 && Math.random() < 0.4) {
                this.createParticle(container);
            }
        }, 3000);
    }

    createParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = '100%';

        const colors = ['#FFC93C', '#FF8FA3', '#3BBFB5', '#6BCB77'];
        particle.style.background = `radial-gradient(circle, ${this.pickRandom(colors)}, #FFE3EC)`;

        const size = Math.random() * 12 + 8;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';

        container.appendChild(particle);

        setTimeout(() => {
            particle.parentNode?.removeChild(particle);
        }, 8000);
    }

    showCelebration(x, y) {
        const container = document.getElementById('celebration-container');
        const items = ['🎉', '⭐', '🌟', '💫', '✨', '🎊', '🎈'];

        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const item = document.createElement('div');
                item.className = 'celebration-item';
                item.textContent = this.pickRandom(items);

                const offsetX = (Math.random() - 0.5) * 200;
                const offsetY = (Math.random() - 0.5) * 200;
                item.style.left = (x + offsetX) + 'px';
                item.style.top = (y + offsetY) + 'px';

                container.appendChild(item);
                this.celebrationItems.push(item);

                setTimeout(() => {
                    item.parentNode?.removeChild(item);
                    this.celebrationItems = this.celebrationItems.filter(c => c !== item);
                }, 2000);
            }, i * 100);
        }
    }

    showSuccessFlash() {
        const flash = document.createElement('div');
        flash.className = 'success-flash';
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.parentNode?.removeChild(flash);
        }, 1000);
    }

    showStars(element) {
        const starsContainer = document.createElement('div');
        starsContainer.className = 'stars';

        const rect = element.getBoundingClientRect();
        starsContainer.style.left = rect.left + 'px';
        starsContainer.style.top = rect.top + 'px';
        starsContainer.style.width = rect.width + 'px';
        starsContainer.style.height = rect.height + 'px';

        for (let i = 0; i < 5; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.textContent = '⭐';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 1.5 + 's';
            starsContainer.appendChild(star);
        }

        document.body.appendChild(starsContainer);

        setTimeout(() => {
            starsContainer.parentNode?.removeChild(starsContainer);
        }, 3000);
    }
    
    /* ---------- 추가 기능들 ---------- */
    
    // 난이도 설정
    setDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.diff === difficulty);
            btn.setAttribute('aria-pressed', btn.dataset.diff === difficulty ? 'true' : 'false');
        });
        
        // 난이도에 따른 피드백
        const messages = {
            'easy': '쉬운 모드로 시작해요!',
            'medium': '보통 모드로 도전해요!',
            'hard': '어려운 모드! 화이팅!'
        };
        
        this.showMascotBubble(messages[difficulty]);
        if (this.soundEnabled) {
            this.speak(messages[difficulty]);
        }
    }
    
    // 진행률 업데이트
    updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        const levelBadge = document.getElementById('level-badge');
        
        if (progressFill && levelBadge) {
            const totalLevels = 20; // 목표 게임 수
            const progress = Math.min((this.totalGamesPlayed / totalLevels) * 100, 100);
            const level = Math.floor(this.totalGamesPlayed / 4) + 1;
            
            progressFill.style.width = progress + '%';
            levelBadge.textContent = level + '단계';
        }
    }
    
    // 로딩 표시
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('show', show);
            overlay.setAttribute('aria-hidden', !show);
        }
    }
    
    // 마스코트 말풍선 표시
    showMascotBubble(message) {
        const bubble = document.getElementById('mascot-bubble');
        if (!bubble) return;
        
        bubble.textContent = message;
        bubble.classList.add('show');
        
        setTimeout(() => {
            bubble.classList.remove('show');
        }, 2000);
    }
    
    // 음성 토글
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.getElementById('sound-toggle');
        if (btn) {
            btn.textContent = this.soundEnabled ? '🔊 켜짐' : '🔇 꺼짐';
            btn.setAttribute('aria-pressed', this.soundEnabled ? 'true' : 'false');
            btn.setAttribute('aria-label', this.soundEnabled ? '음성 안내 끄기' : '음성 안내 켜기');
        }
        
        if (this.soundEnabled) {
            this.showMascotBubble('음성 안내가 켜졌어요!');
            this.speak('음성 안내가 켜졌어요');
        } else {
            this.showMascotBubble('음성 안내가 꺼졌어요');
        }
    }
    
    // 진행 상황 초기화
    resetProgress() {
        if (confirm('정말로 모든 진행 상황을 초기화할까요?')) {
            this.stickers = 0;
            this.sentenceLevel = 0;
            this.totalGamesPlayed = 0;
            localStorage.setItem('signStars', '0');
            this.updateStickerBar();
            this.updateProgress();
            this.showMascotBubble('처음부터 시작해요!');
            if (this.soundEnabled) {
                this.speak('처음부터 다시 시작해요');
            }
        }
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new SignLanguageApp();
});
