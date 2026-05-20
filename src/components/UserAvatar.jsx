import {
  getProfileAvatarOption,
  normalizeProfileAvatarFields,
} from '../constants/profileAvatars';

const UserAvatar = ({
  profile,
  avatarType,
  avatarId,
  avatarUrl,
  size,
  className = '',
  selected = false,
  label = 'Profil avatarı',
  decorative = false,
}) => {
  const resolved = normalizeProfileAvatarFields({
    ...(profile || {}),
    avatarType: avatarType ?? profile?.avatarType,
    avatarId: avatarId ?? profile?.avatarId,
    avatarUrl: avatarUrl ?? profile?.avatarUrl,
  });
  const option = getProfileAvatarOption(resolved.avatarId);
  const Icon = option.icon;
  const isImage = resolved.avatarType === 'image' && resolved.avatarUrl;
  const classes = [
    'profile-avatar',
    isImage ? 'profile-avatar-image' : 'profile-avatar-preset',
    selected ? 'selected' : '',
    className,
  ].filter(Boolean).join(' ');
  const accessibilityProps = decorative
    ? { 'aria-hidden': 'true' }
    : { role: 'img', 'aria-label': label };
  const sizeStyle = size
    ? { width: `${size}px`, height: `${size}px` }
    : null;

  return (
    <span
      className={classes}
      style={{
        '--avatar-gradient': option.gradient,
        ...sizeStyle,
      }}
      {...accessibilityProps}
    >
      {isImage ? (
        <img src={resolved.avatarUrl} alt="" />
      ) : (
        <>
          <span className="profile-avatar-highlight" aria-hidden="true" />
          <Icon className="profile-avatar-icon" aria-hidden="true" strokeWidth={2.1} />
        </>
      )}
    </span>
  );
};

export default UserAvatar;
