import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AdminUser } from '../api/admin';

export type RootStackParamList = {
  Users: undefined;
  UserDetail: { user: AdminUser };
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
