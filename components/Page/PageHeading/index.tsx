import './styles.module.scss';
import type { ReactNode } from 'react';

export type PageHeadingProps = { children: ReactNode };

const PageHeading = ({ children }: PageHeadingProps) => (
	<div className="page-heading translucent-text">
		{children}
	</div>
);

export default PageHeading;