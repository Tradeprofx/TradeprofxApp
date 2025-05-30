import React from 'react';
import classNames from 'classnames';
import Icon from '../icon';
import Text from '../text';
import { formatDurationTime } from '@deriv/shared';
import VolumeControl from './volume-control';
import PlaybackRateControl from './playback-rate-control';
import clsx from 'clsx';

type TVideoControls = {
    block_controls?: boolean;
    current_time?: number;
    dragStartHandler: (e: React.MouseEvent<HTMLSpanElement> | React.TouchEvent<HTMLSpanElement>) => void;
    has_enlarged_dot?: boolean;
    hide_volume_control?: boolean;
    is_animated?: boolean;
    is_ended?: boolean;
    is_playing?: boolean;
    is_mobile?: boolean;
    is_muted?: boolean;
    is_v2?: boolean;
    increased_drag_area?: boolean;
    onRewind: (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
    onVolumeChange: (new_value: number) => void;
    onPlaybackRateChange: (new_value: number) => void;
    onUserActivity: () => void;
    progress_bar_filled_ref: React.RefObject<HTMLDivElement>;
    progress_bar_ref: React.RefObject<HTMLDivElement>;
    progress_dot_ref: React.RefObject<HTMLSpanElement>;
    playback_rate: number;
    show_controls?: boolean;
    togglePlay: (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => void;
    toggleMute: (new_value: boolean) => void;
    video_duration?: number;
    volume?: number;
};

const VideoControls = ({
    block_controls,
    current_time,
    dragStartHandler,
    has_enlarged_dot,
    hide_volume_control = false,
    is_animated,
    is_ended,
    is_playing,
    is_mobile,
    is_muted,
    is_v2 = false,
    increased_drag_area,
    onRewind,
    onVolumeChange,
    onPlaybackRateChange,
    progress_bar_filled_ref,
    progress_bar_ref,
    progress_dot_ref,
    playback_rate,
    show_controls,
    togglePlay,
    toggleMute,
    video_duration,
    volume,
    onUserActivity,
}: TVideoControls) => {
    const [is_drag_dot_visible, setIsDragDotVisible] = React.useState(false);

    const handleUserInteraction = () => {
        onUserActivity?.();
    };

    return (
        <div
            className={classNames('player__controls__wrapper', {
                'player__controls__wrapper--visible': show_controls,
                'player__controls__wrapper--interactive': show_controls,
            })}
            onMouseMove={handleUserInteraction}
            onTouchStart={handleUserInteraction}
            onTouchMove={handleUserInteraction}
            onClick={handleUserInteraction}
        >
            {is_v2 && (
                <div
                    className={classNames('player__controls__bottom-bar--v2', {
                        'player__controls__bottom-bar--blocked': block_controls,
                    })}
                >
                    <div className='controls__right--v2'>
                        {!hide_volume_control && (
                            <VolumeControl
                                onVolumeChange={onVolumeChange}
                                volume={volume}
                                is_mobile={is_mobile}
                                is_muted={is_muted}
                                toggleMute={toggleMute}
                                is_v2
                            />
                        )}
                        <PlaybackRateControl
                            onPlaybackRateChange={onPlaybackRateChange}
                            is_mobile={is_mobile}
                            playback_rate={playback_rate}
                            is_v2
                            show_controls={show_controls}
                        />
                    </div>
                    <div className='controls__left--v2'>
                        <div className='player__controls__time-wrapper--v2'>
                            <Text size='xxxs' line_height='s' color='colored-background'>
                                {formatDurationTime(current_time)}
                                {' / '}
                                {formatDurationTime(video_duration)}
                            </Text>
                        </div>
                    </div>
                </div>
            )}
            <div
                className={clsx('player__controls__progress-bar', { 'player__controls__progress-bar--v2': is_v2 })}
                onClick={onRewind}
                onKeyDown={onRewind}
                onMouseOver={() => setIsDragDotVisible(true)}
                onFocus={() => null}
                onMouseLeave={() => setIsDragDotVisible(false)}
                ref={progress_bar_ref}
                data-testid='dt_progress_bar'
            >
                <div
                    className={classNames('player__controls__progress-bar__filled', {
                        'player__controls__progress-bar__filled--animated': is_animated,
                        'player__controls__progress-bar__filled--ended': is_ended,
                    })}
                    ref={progress_bar_filled_ref}
                    data-testid='dt_progress_bar_filled'
                >
                    {(is_mobile || is_drag_dot_visible) && (
                        <span
                            className={classNames('player__progress-dot', {
                                'player__progress-dot--enlarged': has_enlarged_dot,
                                'player__progress-dot--increased-drag-area': increased_drag_area,
                            })}
                            onMouseDown={dragStartHandler}
                            onTouchStart={dragStartHandler}
                            ref={progress_dot_ref}
                            data-testid='dt_progress_bar_dot'
                        />
                    )}
                </div>
            </div>
            {!is_v2 && (
                <div
                    className={classNames('player__controls__bottom-bar', {
                        'player__controls__bottom-bar--blocked': block_controls,
                    })}
                >
                    <div className='player__controls__bottom-bar controls__left'>
                        <button onClick={togglePlay} className='player__controls__button'>
                            <Icon
                                icon={is_playing ? 'IcPause' : 'IcPlay'}
                                custom_color='var(--text-colored-background)'
                                height={18}
                                width={15}
                            />
                        </button>
                        <div className='player__controls__time-wrapper'>
                            <Text size='xxxs' line_height='s' color='colored-background'>
                                {formatDurationTime(current_time)}
                                {' / '}
                                {formatDurationTime(video_duration)}
                            </Text>
                        </div>
                    </div>
                    <div className='player__controls__bottom-bar'>
                        {!hide_volume_control && (
                            <VolumeControl
                                onVolumeChange={onVolumeChange}
                                volume={volume}
                                is_mobile={is_mobile}
                                is_muted={is_muted}
                                toggleMute={toggleMute}
                            />
                        )}
                        <PlaybackRateControl
                            onPlaybackRateChange={onPlaybackRateChange}
                            is_mobile={is_mobile}
                            playback_rate={playback_rate}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoControls;
