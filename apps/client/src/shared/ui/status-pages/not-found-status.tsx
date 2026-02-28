import { Link } from 'react-router';
import { Button } from '@/shared/ui/button';
import { StatusLayout, type StatusSize } from './status-layout';

interface NotFoundStatusProps {
  fullScreen?: boolean;
  size?: StatusSize;
}

export function NotFoundStatus({ fullScreen, size = 'lg' }: NotFoundStatusProps) {
  return (
    <StatusLayout
      code='404'
      title='페이지를 찾을 수 없습니다'
      description={
        <>
          요청하신 페이지가 존재하지 않거나
          <br />
          이동되었을 수 있습니다.
        </>
      }
      actions={
        <Button
          asChild
          size='lg'
          variant='default'
        >
          <Link to='/'>홈으로</Link>
        </Button>
      }
      fullScreen={fullScreen}
      size={size}
    />
  );
}
