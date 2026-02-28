import { Link } from 'react-router';
import { Button } from '@/shared/ui/button';
import { StatusLayout, type StatusSize } from './status-layout';

interface ErrorStatusProps {
  onRetry?: () => void;
  actions?: React.ReactNode;
  fullScreen?: boolean;
  size?: StatusSize;
}

export function ErrorStatus({ onRetry, actions, fullScreen, size = 'lg' }: ErrorStatusProps) {
  return (
    <StatusLayout
      code='ERROR'
      title='어플리케이션에 문제가 발생했습니다'
      description={
        <>
          예기치 않은 오류가 발생했습니다.
          <br />
          잠시 후 다시 시도해 주세요.
        </>
      }
      actions={
        <div className='flex gap-2'>
          {actions ?? (
            <>
              <Button
                size='lg'
                onClick={onRetry}
                className='w-32'
                variant='default'
              >
                다시 시도
              </Button>
              <Button
                asChild
                variant='black'
                size='lg'
              >
                <Link to='/'>홈으로</Link>
              </Button>
            </>
          )}
        </div>
      }
      fullScreen={fullScreen}
      size={size}
    />
  );
}
