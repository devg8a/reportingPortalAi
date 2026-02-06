import React from 'react'

interface CommonLoaderProps {
  className?: string;
  containerClassName?: string;
  loaderClass?: string;
}
const CommonLoader: React.FC<CommonLoaderProps> = ({ className, containerClassName, loaderClass = "custom-loader-img" }) => {
  return (
    <div className={`custom-loader-container ${containerClassName || ''}`}>
      <div className={loaderClass}>
        <img src="/assets/custom-loader.gif" alt="Loading..." className={className} />
      </div>
    </div>
  )
}

export default CommonLoader
