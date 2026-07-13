const title = document.getElementById('title');
const status = document.getElementById('status');
const player = document.getElementById('player');
const machine = document.getElementById('machine');
const hint = document.querySelector('.hint');

const STARTUP_DELAY = 900;
const STATUS_INTERVAL_MIN = 5500;
const STATUS_INTERVAL_VARIANCE = 2500;

const INTRO_MESSAGES = [
  'Acquiring signal...',
  '████░░░░░',
  'Receiver locked.',
  'Decrypting...',
  '██████████',
  'Transmission in progress.'
];

const TRANSMISSION_MESSAGES = [
  'Transmission in progress.',
  '送信中。',
  'Передача продолжается.',
  'Übertragung läuft.',
  '传输进行中。',
  'Lähetys käynnissä.',
  'Transmisión en curso.',
  '송신 진행 중.',
  'Sending í gangi.',
  'Transmission en cours.',
  'Трансляція триває.',
  'Transmisjon pågår.',
  'Overdracht bezig.',
  'Adás folyamatban.',
  'Trasmissione in corso.',
  'Transmissão em andamento.',
  'שידור מתבצע.',
  'Μετάδοση σε εξέλιξη.',
  'İletim sürüyor.',
  'Transmisja w toku.',
  'Přenos probíhá.',
  'Prenos poteka.',
  'Prijenos u tijeku.',
  'ส่งสัญญาณอยู่',
  'प्रसारण जारी है।',
  '傳輸進行中。',
  'Sändning pågår.',
  'Transmission i gang.',
  'Prenos prebieha.'
];

const TRANSMISSION_TRACKS = [
  { src: 'audio/SITW_TX001.mp3', volume: 0.30 },
  { src: 'audio/SITW_TX002.mp3', volume: 0.03 },
  { src: 'audio/SITW_TX003.mp3', volume: 0.23 }
];

const AUDIO = {
  ambienceVolume: 0.06,
  ambienceFadeDuration: 18000,
  transmissionFadeInDuration: 1800,
  transmissionFadeOutDuration: 2200
};

let lastMessageIndex = -1;
let currentTrackIndex = 0;
let statusUpdateToken = 0;
let fadeOutStarted = false;
let receptionStarted = false;

/** Wait for a specified duration. */
function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

/** Animate an audio element's volume smoothly. */
function fadeAudio(audio, targetVolume, duration) {
  const startVolume = audio.volume;
  const startTime = performance.now();

  return new Promise((resolve) => {
    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = progress * progress * (3 - 2 * progress);

      audio.volume = startVolume + (targetVolume - startVolume) * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

/** Replace the status text while preserving its CSS transition hook. */
function showStatus(message) {

    status.classList.remove('visible');

    window.setTimeout(() => {

        status.textContent = message;

        requestAnimationFrame(() => {
            status.classList.add('visible');
        });

    },400);

}

/** Choose a language without repeating the immediately previous one. */
function showRandomTransmissionMessage() {
  let nextIndex;

  do {
    nextIndex = Math.floor(Math.random() * TRANSMISSION_MESSAGES.length);
  } while (nextIndex === lastMessageIndex);

  lastMessageIndex = nextIndex;
  showStatus(TRANSMISSION_MESSAGES[nextIndex]);
}

/** Continue cycling through transmissions at varied intervals. */
function scheduleTransmissionMessages() {
  const nextDelay =
    STATUS_INTERVAL_MIN + Math.random() * STATUS_INTERVAL_VARIANCE;

  window.setTimeout(() => {
    showRandomTransmissionMessage();
    scheduleTransmissionMessages();
  }, nextDelay);
}

/** Start the machine-room ambience and bring it in gently. */
async function startAmbience() {
  machine.volume = 0;
  machine.currentTime = 0;

  try {
    await machine.play();
    await fadeAudio(machine, AUDIO.ambienceVolume, AUDIO.ambienceFadeDuration);
  } catch {
    // Playback may be blocked by browser settings; a later user gesture can retry it.
  }
}

/** Load and play the current transmission track with a fade-in. */
async function playCurrentTransmission() {
  const track = TRANSMISSION_TRACKS[currentTrackIndex];
  fadeOutStarted = false;
  player.pause();
  player.removeAttribute("src");
  player.load();

  player.src = track.src;
  player.load();

  player.currentTime = 0;
  player.volume = 0;

  try {
    await player.play();
    await fadeAudio(player, track.volume, AUDIO.transmissionFadeInDuration);
  } catch {
    // Playback may be blocked by browser settings; the ambience remains available.
  }
}

/** Fade a transmission out shortly before its natural end. */
function handleTransmissionProgress() {
  if (
    fadeOutStarted ||
    !Number.isFinite(player.duration) ||
    player.duration - player.currentTime > AUDIO.transmissionFadeOutDuration / 1000
  ) {
    return;
  }

  fadeOutStarted = true;
  fadeAudio(player, 0, AUDIO.transmissionFadeOutDuration);
}

/** Advance to the next transmission after the current one completes. */
async function handleTransmissionEnd() {

  currentTrackIndex =
    (currentTrackIndex + 1) % TRANSMISSION_TRACKS.length;

  showRandomTransmissionMessage();

  await wait(350);

  playCurrentTransmission();

}

/** Reveal the interface and begin the reception sequence. */
async function beginReception() {
  await wait(STARTUP_DELAY);

  title.classList.add('visible');
  startAmbience();

  await wait(3200);

  for (const message of INTRO_MESSAGES) {
    showStatus(message);
    await wait(2100);
  }

showRandomTransmissionMessage();

scheduleTransmissionMessages();
await wait(900);
playCurrentTransmission();

}

player.addEventListener('timeupdate', handleTransmissionProgress);
player.addEventListener('ended', handleTransmissionEnd);

document.body.addEventListener(
  'click',
  () => {
    if (receptionStarted) return;

    receptionStarted = true;
    hint.style.display = 'none';
    beginReception();
  },
  { once: true }
);
