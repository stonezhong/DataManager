import React from 'react'

import './pipeline.scss'


/*************************************************************************
 * props
 *     pipeline         : the pipeline object
 *
 */
export class PipelineLink extends React.Component {
    render() {
        return (
            <a href={`/explorer/${this.props.tenant_id}/pipeline?id=${this.props.pipeline.id}`}>
                {this.props.pipeline.name}
            </a>
        );
    }
}

