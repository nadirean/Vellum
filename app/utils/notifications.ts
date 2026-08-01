import * as Notifications from 'expo-notifications';

import { PLAYBACK_CATEGORY_ID, PLAYBACK_CHANNEL_ID, PlaybackAction } from '@consts/notifications';

export async function setupNotifications() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return false;
  }

  await Notifications.setNotificationChannelAsync(PLAYBACK_CHANNEL_ID, {
    name: 'Playback Controls',
    importance: Notifications.AndroidImportance.LOW, // Low importance to avoid sound/pop-up every update
    showBadge: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: false,
  });

  await Notifications.setNotificationCategoryAsync(PLAYBACK_CATEGORY_ID, [
    {
      identifier: PlaybackAction.TOGGLE,
      buttonTitle: 'Play / Pause',
      options: { opensAppToForeground: false },
    },
  ]);
}

export async function updatePlaybackNotification(
  title: string,
  author: string,
  isPlaying: boolean,
  progress: number,
) {
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${isPlaying ? 'Playing' : 'Paused'} (${Math.round(progress)}%)`,
      body: `${author} - ${title}`,
      categoryIdentifier: PLAYBACK_CATEGORY_ID,
      color: '#427A43',
      sticky: true,
      autoDismiss: false,
      data: { type: 'playback' },
    },
    trigger: null,
    identifier: 'playback-notification',
  });
}

export async function dismissPlaybackNotification() {
  await Notifications.dismissNotificationAsync('playback-notification');
}
