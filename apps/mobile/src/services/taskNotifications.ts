import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import {
  NOTIFICATION_RULES,
  buildTaskNotificationCandidates,
  isTaskNotificationIdentifier,
} from '@tasmate/core';
import type { NotificationSettings, Task } from '@tasmate/types';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

export interface NotificationPermissionInfo {
  status: NotificationPermissionState;
  canAskAgain: boolean;
}

export type ExactAlarmPermissionState =
  | NotificationPermissionState
  | 'unsupported';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

async function ensureNotificationsReady(): Promise<void> {
  if (channelReady) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      NOTIFICATION_RULES.channelId,
      {
        name: '予定クエスト',
        description: '予定したクエストの開始時刻と未完了をお知らせします',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#0B5FE3',
        sound: 'default',
        vibrationPattern: [0, 200],
      },
    );
  }
  channelReady = true;
}

function isGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  return (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function toPermissionInfo(
  status: Notifications.NotificationPermissionsStatus,
): NotificationPermissionInfo {
  if (isGranted(status)) {
    return { status: 'granted', canAskAgain: status.canAskAgain };
  }
  return {
    status: status.status === 'denied' ? 'denied' : 'undetermined',
    canAskAgain: status.canAskAgain,
  };
}

export async function getNotificationPermissionInfo(): Promise<NotificationPermissionInfo> {
  const status = await Notifications.getPermissionsAsync();
  return toPermissionInfo(status);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionInfo> {
  await ensureNotificationsReady();
  const current = await Notifications.getPermissionsAsync();
  if (isGranted(current) || !current.canAskAgain) {
    return toPermissionInfo(current);
  }
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return toPermissionInfo(requested);
}

export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function getExactAlarmPermissionState(): Promise<ExactAlarmPermissionState> {
  if (Platform.OS !== 'android') return 'unsupported';
  const status = await Notifications.getExactAlarmPermissionsAsync();
  return toPermissionInfo(status).status;
}

export async function requestExactAlarmPermission(): Promise<ExactAlarmPermissionState> {
  if (Platform.OS !== 'android') return 'unsupported';
  try {
    const status = await Notifications.requestExactAlarmPermissionsAsync();
    return toPermissionInfo(status).status;
  } catch {
    return 'denied';
  }
}

interface SyncNotificationOptions {
  tasks: readonly Task[];
  settings: NotificationSettings;
  now?: Date;
}

let syncQueue: Promise<void> = Promise.resolve();

/**
 * 予定クエスト通知をOSへ同期する。
 * このアプリが予約した通知だけを解除してから、最新の候補を近い順に予約する。
 */
export function syncTaskNotifications(options: SyncNotificationOptions): Promise<void> {
  syncQueue = syncQueue.then(() => performSync(options)).catch(() => undefined);
  return syncQueue;
}

async function performSync({
  tasks,
  settings,
  now = new Date(),
}: SyncNotificationOptions): Promise<void> {
  await ensureNotificationsReady();

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ownNotifications = scheduled.filter((request) =>
    isTaskNotificationIdentifier(request.identifier),
  );
  await Promise.all(
    ownNotifications.map((request) =>
      Notifications.cancelScheduledNotificationAsync(request.identifier),
    ),
  );

  if (!settings.enabled) return;

  const permission = await getNotificationPermissionInfo();
  if (permission.status !== 'granted') return;

  const candidates = buildTaskNotificationCandidates(tasks, settings, now);
  await Promise.allSettled(
    candidates.map((candidate) =>
      Notifications.scheduleNotificationAsync({
        identifier: candidate.identifier,
        content: {
          title: candidate.title,
          body: candidate.body,
          data: candidate.data,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(candidate.triggerAt),
          channelId: NOTIFICATION_RULES.channelId,
          delivery: 'alarmClock',
        },
      }),
    ),
  );
}

function taskIdFromResponse(
  response: Notifications.NotificationResponse,
): string | null {
  const taskId = response.notification.request.content.data?.['taskId'];
  return typeof taskId === 'string' ? taskId : null;
}

/** 通知タップを受け取る。戻り値は購読解除関数 */
export function subscribeToTaskNotificationResponses(
  listener: (taskId: string | null) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      if (!isTaskNotificationIdentifier(response.notification.request.identifier)) {
        return;
      }
      Notifications.clearLastNotificationResponse();
      listener(taskIdFromResponse(response));
    },
  );
  return () => subscription.remove();
}

/** アプリ起動の原因になった通知タップを一度だけ取り出す */
export function consumeInitialTaskNotificationResponse(): { taskId: string | null } | null {
  const response = Notifications.getLastNotificationResponse();
  if (response === null || response === undefined) return null;
  if (!isTaskNotificationIdentifier(response.notification.request.identifier)) {
    return null;
  }
  Notifications.clearLastNotificationResponse();
  return { taskId: taskIdFromResponse(response) };
}
