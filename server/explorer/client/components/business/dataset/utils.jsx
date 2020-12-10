import React from 'react'

/*********************************************************************************
 * Purpose: Link to a dataset
 *
 * Props
 *     ds       : dataset
 *
 */
export class DatasetLink extends React.Component {
    render() {
        return <a href={`/explorer/dataset?id=${this.props.ds.id}`}>
            {this.props.ds.name}:{this.props.ds.major_version}:{this.props.ds.minor_version}
        </a>;
    }
}

/*********************************************************************************
 * Purpose: Link to a asset
 *
 * Props
 *     ds       : dataset
 *     dsi      : dataset instance
 *
 */
export class AssetLink extends React.Component {
    render() {
        return <a href={`/explorer/asset?dsi_path=${this.props.ds.name}:${this.props.ds.major_version}:${this.props.ds.minor_version}:${this.props.dsi.path}`}>{this.props.dsi.path}</a>;
    }
}

/*********************************************************************************
 * Purpose: Link to a asset
 *
 * Props
 *     dsi_path : A full dsi path, may or may not have revision. E.g.: trading:1.0:1:/foo:0
 *                or trading:1.0:1:/foo
 *
 */
export class AssetLinkFromDSIPath extends React.Component {
    render() {
        const segs = this.props.dsi_path.split(":");
        if (segs.length == 4) {
            return <a href={`/explorer/asset?dsi_path=${this.props.dsi_path}`}>{this.props.dsi_path}</a>;
        }
        if (segs.length == 5) {
            const dsi_path2 = segs.slice(0, 4).join(':');
            const revision = segs[4];
            return <a href={`/explorer/asset?dsi_path=${dsi_path2}#revision-${segs[4]}`}>{this.props.dsi_path}</a>;
        }
        throw Exception(`${this.props.dsi_path} is not a valid asset path`);
    }
}
